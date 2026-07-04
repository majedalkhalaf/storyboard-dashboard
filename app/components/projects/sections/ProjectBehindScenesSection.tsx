"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import VideoWithMuteToggle from "@/app/components/ui/VideoWithMuteToggle";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { relativeTime } from "../utils";
import type { BehindScenesComment, BehindScenesMediaItem, BehindScenesMediaType, BehindScenesPost, Project } from "@/app/lib/types";

interface PostRow extends BehindScenesPost {
  author_name: string | null;
  comments: (BehindScenesComment & { author_name: string | null })[];
  likes_count: number;
}

function mediaType(file: File): BehindScenesMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

// قسم "الكواليس" — منشورات يومية غير رسمية داخل المشروع، مستقلة تماماً عن
// الحلقات/الملفات/الملاحظات. المنشور يُشارك مع العميل أو يبقى داخلياً حسب
// اختيار صريح عند النشر؛ الإعجاب/التعليق يُفعَّلان أو يُعطَّلان لكل المشروع
// من هنا. الوسائط تُرفع مباشرة إلى مساحة عامة (نفس مساحة شعار الشركة
// والصور الشخصية) لتُعرض فوراً بلا حاجة لروابط موقّعة تنتهي صلاحيتها —
// بنفس نموذج الثقة المتّبع أصلاً لكل الأصول العامة في النظام.
export default function ProjectBehindScenesSection({ project, onProjectChanged }: { project: Project; onProjectChanged: (patch: Partial<Project>) => void }) {
  const { company } = useSession();
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("behind_scenes_posts")
      .select("*, author:profiles!author_id(full_name), comments:behind_scenes_comments(*, author:profiles!author_id(full_name)), likes:behind_scenes_likes(id)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
    const rows = ((data ?? []) as Record<string, unknown>[]).map((p) => ({
      ...(p as unknown as BehindScenesPost),
      author_name: one<{ full_name: string | null }>(p.author as never)?.full_name ?? null,
      comments: ((p.comments as Record<string, unknown>[]) ?? []).map((c) => ({
        ...(c as unknown as BehindScenesComment),
        author_name: one<{ full_name: string | null }>(c.author as never)?.full_name ?? null,
      })),
      likes_count: ((p.likes as unknown[]) ?? []).length,
    })) as PostRow[];
    setPosts(rows);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل منشورات الكواليس عند فتح القسم، النمط القياسي في هذا المشروع
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`bts-internal:${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "behind_scenes_posts", filter: `project_id=eq.${project.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "behind_scenes_comments", filter: `project_id=eq.${project.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "behind_scenes_likes", filter: `project_id=eq.${project.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load مُعاد إنشاؤه كل عرض عمداً ليقرأ project.id الحالي دوماً
  }, [project.id]);

  async function toggleSetting(key: "bts_allow_likes" | "bts_allow_comments", value: boolean) {
    onProjectChanged({ [key]: value });
    const supabase = createClient();
    await supabase.from("projects").update({ [key]: value }).eq("id", project.id);
  }

  async function deletePost(id: string) {
    if (!confirm("حذف هذا المنشور نهائياً؟")) return;
    const supabase = createClient();
    await supabase.from("behind_scenes_posts").delete().eq("id", id);
    load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={project.bts_allow_likes} onChange={(e) => toggleSetting("bts_allow_likes", e.target.checked)} style={{ accentColor: "var(--gold)" }} />
            السماح للعميل بالإعجاب
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={project.bts_allow_comments} onChange={(e) => toggleSetting("bts_allow_comments", e.target.checked)} style={{ accentColor: "var(--gold)" }} />
            السماح للعميل بالتعليق
          </label>
        </div>
        <button className="btn btn-gold" style={{ fontSize: 12.5 }} onClick={() => setComposerOpen(true)}>
          <Icon name="plus" size={15} /> منشور جديد
        </button>
      </div>

      {(composerOpen || editingPost) && (
        <PostComposer
          companyId={company?.id ?? ""}
          projectId={project.id}
          editingPost={editingPost}
          onClose={() => {
            setComposerOpen(false);
            setEditingPost(null);
          }}
          onCreated={() => {
            setComposerOpen(false);
            setEditingPost(null);
            load();
          }}
        />
      )}

      {!posts ? (
        <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
      ) : posts.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد منشورات كواليس بعد. أنشئ أول منشور لمشاركة أجواء العمل.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onEdit={() => setEditingPost(p)} onDelete={() => deletePost(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onEdit, onDelete }: { post: PostRow; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{post.author_name ?? "عضو الفريق"}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(post.created_at)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="chip"
            style={{ fontSize: 10.5, color: post.shared_with_client ? "var(--success)" : "var(--text-muted)", borderColor: post.shared_with_client ? "var(--success)" : "var(--border)" }}
          >
            {post.shared_with_client ? "مشترك مع العميل" : "خاص بفريق العمل"}
          </span>
          <button className="btn btn-ghost" style={{ padding: "4px 6px" }} onClick={onEdit} aria-label="تعديل">
            <Icon name="edit" size={14} className="text-muted" />
          </button>
          <button className="btn btn-ghost" style={{ padding: "4px 6px" }} onClick={onDelete} aria-label="حذف">
            <Icon name="trash" size={14} className="text-muted" />
          </button>
        </div>
      </div>

      {post.title && <h4 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>{post.title}</h4>}
      {post.body && <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: post.media.length ? 12 : 0 }}>{post.body}</p>}

      {post.media.length > 0 && <MediaGallery media={post.media} />}

      <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="star" size={13} /> {post.likes_count}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="message" size={13} /> {post.comments.length}
        </span>
      </div>

      {post.comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {post.comments.map((c) => (
            <div key={c.id} style={{ fontSize: 12.5 }}>
              <span style={{ fontWeight: 700 }}>{c.author_role === "client" ? "العميل" : c.author_name ?? "عضو الفريق"}</span>{" "}
              <span style={{ color: "var(--text-secondary)" }}>{c.body}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// variant "grid": شبكة مصغّرات مقصوصة (مناسبة لعرض إداري داخلي مضغوط).
// variant "full": كل صورة بعرض كامل وأبعادها الأصلية دون أي قص — هذا ما تطلبه
// بوابة العميل تحديداً كي تبدو المنشورات كمعرض صور احترافي، مع نافذة تكبير
// عند الضغط لعرضها بالحجم الكامل في الحالتين.
export function MediaGallery({ media, variant = "grid" }: { media: BehindScenesMediaItem[]; variant?: "grid" | "full" }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const images = media.filter((m) => m.type === "image");
  const others = media.filter((m) => m.type !== "image");
  const full = variant === "full";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {images.length > 0 && (
        <div
          style={
            full
              ? { display: "flex", flexDirection: "column", gap: 8 }
              : { display: "grid", gridTemplateColumns: images.length === 1 ? "1fr" : "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }
          }
        >
          {images.map((m, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={m.url}
              src={m.url}
              alt={m.name}
              onClick={() => setLightbox(i)}
              style={
                full
                  ? { width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", borderRadius: 10, cursor: "zoom-in", background: "#000" }
                  : { width: "100%", maxHeight: images.length === 1 ? 480 : 220, objectFit: images.length === 1 ? "contain" : "cover", borderRadius: 10, cursor: "zoom-in", background: "#000" }
              }
            />
          ))}
        </div>
      )}
      {others.map((m) =>
        m.type === "video" ? (
          <VideoWithMuteToggle key={m.url} src={m.url} style={{ maxHeight: 420, borderRadius: 10, background: "#000" }} />
        ) : (
          <audio key={m.url} src={m.url} controls style={{ width: "100%" }} />
        )
      )}

      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[lightbox].url} alt={images[lightbox].name} style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain" }} />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox - 1 + images.length) % images.length);
                }}
                className="btn btn-ghost"
                style={{ position: "absolute", insetInlineStart: 16, top: "50%", color: "#fff" }}
              >
                <Icon name="arrowRight" size={22} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox + 1) % images.length);
                }}
                className="btn btn-ghost"
                style={{ position: "absolute", insetInlineEnd: 16, top: "50%", color: "#fff" }}
              >
                <Icon name="arrowLeft" size={22} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PostComposer({
  companyId,
  projectId,
  editingPost,
  onClose,
  onCreated,
}: {
  companyId: string;
  projectId: string;
  editingPost?: PostRow | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const isEditing = Boolean(editingPost);
  const [title, setTitle] = useState(editingPost?.title ?? "");
  const [body, setBody] = useState(editingPost?.body ?? "");
  const [shared, setShared] = useState(editingPost?.shared_with_client ?? false);
  const [media, setMedia] = useState<BehindScenesMediaItem[]>(editingPost?.media ?? []);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(fileList: FileList | File[]) {
    const supabase = createClient();
    for (const file of Array.from(fileList)) {
      setUploadingCount((c) => c + 1);
      try {
        const type = mediaType(file);
        const path = `${companyId}/behind-scenes/${projectId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("public-assets").upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (uploadError) {
          setError("تعذّر رفع أحد الملفات");
          continue;
        }
        const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
        setMedia((prev) => [...prev, { type, url: data.publicUrl, name: file.name }]);
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
  }

  async function submit() {
    if (!title.trim() && !body.trim() && media.length === 0) {
      setError("أضف عنواناً أو نصاً أو وسائط على الأقل.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (isEditing && editingPost) {
      const { error: updateError } = await supabase
        .from("behind_scenes_posts")
        .update({ title: title.trim() || null, body: body.trim() || null, media, shared_with_client: shared })
        .eq("id", editingPost.id);
      setBusy(false);
      if (updateError) {
        setError("تعذّر حفظ التعديلات، حاول مرة أخرى.");
        return;
      }
      onCreated();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("behind_scenes_posts").insert({
      company_id: companyId,
      project_id: projectId,
      author_id: user?.id,
      title: title.trim() || null,
      body: body.trim() || null,
      media,
      shared_with_client: shared,
    });
    setBusy(false);
    if (insertError) {
      setError("تعذّر نشر الكواليس، حاول مرة أخرى.");
      return;
    }
    onCreated();
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Icon name={isEditing ? "edit" : "sparkles"} size={20} className="nav-icon" />
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{isEditing ? "تعديل منشور الكواليس" : "منشور كواليس جديد"}</h3>
        </div>

        <input className="input-field" placeholder="عنوان المنشور (اختياري)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 10 }} />
        <textarea className="input-field" rows={3} placeholder="اكتب تعليقاً يشرح هذه اللحظة..." value={body} onChange={(e) => setBody(e.target.value)} style={{ marginBottom: 14 }} />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? "var(--gold)" : "var(--border)"}`,
            borderRadius: 10,
            padding: 18,
            textAlign: "center",
            cursor: "pointer",
            background: dragActive ? "rgba(var(--gold-rgb),0.06)" : "var(--bg-secondary)",
            marginBottom: 10,
          }}
        >
          <Icon name="fileUp" size={22} className="nav-icon" />
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>اسحب وأفلت صوراً أو فيديو أو تسجيلاً صوتياً، أو اضغط للاختيار</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        </div>

        {uploadingCount > 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>جارٍ رفع {uploadingCount} ملف...</p>}
        {media.length > 0 && <MediaGallery media={media} />}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
          مشاركة مع العميل (تظهر في الصفحة الرئيسية لبوابة العميل)
        </label>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <Icon name="alert" size={15} />
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={busy || uploadingCount > 0}>
            <Icon name={isEditing ? "check" : "send"} size={16} />
            {busy ? (isEditing ? "جارٍ الحفظ..." : "جارٍ النشر...") : isEditing ? "حفظ التعديلات" : "نشر"}
          </button>
        </div>
      </div>
    </div>
  );
}
