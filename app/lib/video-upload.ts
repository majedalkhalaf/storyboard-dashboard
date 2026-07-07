import type { SupabaseClient } from "@supabase/supabase-js";
import { startR2Upload, type R2UploadController } from "./r2-upload";
import { extractVideoMetadata } from "./storage-upload";
import { safeStorageKey } from "./storage-path";
import { logActivity } from "./activity";
import type { ProjectFile } from "./types";

export interface UploadEpisodeVideoParams {
  companyId: string;
  projectId: string;
  episodeId: string;
  uploadedBy: string;
  uploadedByRole: string;
  clientVisible: boolean;
  file: File;
}

export interface UploadEpisodeVideoHandlers {
  onProgress: (loaded: number, total: number) => void;
  onError: (message: string) => void;
  onSuccess: (file: ProjectFile) => void;
}

// رفع فيديو مستقل لحلقة — يُستخدم من تبويب الفيديو مباشرة بدل المرور بمُحمِّل
// الملفات العام (نفس مسار Cloudflare R2 وحساب بيانات الفيديو/الصورة المصغّرة
// المستخدم في FilesPanel، لكن كتدفق مستقل بلا طابور رفع متعدد الملفات).
export function uploadEpisodeVideo(
  supabase: SupabaseClient,
  params: UploadEpisodeVideoParams,
  handlers: UploadEpisodeVideoHandlers
): Promise<R2UploadController> {
  let key = "";

  async function finalize() {
    try {
      const meta = await extractVideoMetadata(params.file);
      let thumbnailUrl: string | null = null;
      if (meta.thumbnailBlob) {
        const thumbPath = `${params.companyId}/thumbnails/${safeStorageKey(params.file.name).replace(/\.[a-zA-Z0-9]+$/, "")}.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from("public-assets")
          .upload(thumbPath, meta.thumbnailBlob, { upsert: false, contentType: "image/jpeg" });
        if (!thumbErr) thumbnailUrl = supabase.storage.from("public-assets").getPublicUrl(thumbPath).data.publicUrl;
      }

      const ext = params.file.name.includes(".") ? (params.file.name.split(".").pop() ?? "").toLowerCase() : null;
      const { data, error } = await supabase
        .from("files")
        .insert({
          company_id: params.companyId,
          project_id: params.projectId,
          episode_id: params.episodeId,
          uploaded_by: params.uploadedBy,
          uploaded_by_role: params.uploadedByRole,
          name: params.file.name,
          original_name: params.file.name,
          storage_path: key,
          bucket_name: "r2",
          file_type: params.file.type || null,
          mime_type: params.file.type || null,
          file_extension: ext,
          category: "video",
          size_bytes: params.file.size,
          client_visible: params.clientVisible,
          client_can_view: params.clientVisible,
          client_can_download: params.clientVisible,
          status: "ready",
          thumbnail_url: thumbnailUrl,
          duration_seconds: meta.durationSeconds,
          width: meta.width,
          height: meta.height,
        })
        .select("*")
        .single();
      if (error || !data) {
        handlers.onError("تم رفع الفيديو لكن فشل حفظ بياناته");
        return;
      }

      await logActivity(supabase, {
        companyId: params.companyId,
        projectId: params.projectId,
        episodeId: params.episodeId,
        action: "file_uploaded",
        details: { name: params.file.name, category: "video", size_bytes: params.file.size },
      });

      handlers.onSuccess(data as ProjectFile);
    } catch (err) {
      handlers.onError(err instanceof Error ? err.message : "تم رفع الفيديو لكن فشل حفظ بياناته");
    }
  }

  return startR2Upload(
    { file: params.file, projectId: params.projectId, episodeId: params.episodeId, category: "video" },
    {
      onProgress: handlers.onProgress,
      onError: handlers.onError,
      onSuccess: () => {
        finalize();
      },
    }
  ).then(({ key: resolvedKey, controller }) => {
    key = resolvedKey;
    return controller;
  });
}
