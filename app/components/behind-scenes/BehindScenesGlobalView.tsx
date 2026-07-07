"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { uploadMediaFile } from "@/app/lib/media-upload";
import { relativeTime } from "@/app/components/projects/utils";
import { MediaGallery } from "@/app/components/projects/sections/ProjectBehindScenesSection";
import type { BehindScenesComment, BehindScenesMediaItem, BehindScenesPost } from "@/app/lib/types";

interface ProjectOption {
  id: string;
  name: string;
}

interface EpisodeOption {
  id: string;
  project_id: string;
  title: string;
}

interface PostRow extends BehindScenesPost {
  author_name: string | null;
  project_name: string | null;
  episode_title: string | null;
  comments: (BehindScenesComment & { author_name: string | null })[];
  likes_count: number;
}

// النسخة الشاملة لكل المشاريع من قسم "الكواليس" — يظهر كعنصر أساسي في القائمة
// الجانبية (بخلاف نسخة المشروع الواحد المتاحة من داخل تفاصيل كل مشروع)، وتعرض
// منشورات كل المشاريع مع شارة اسم المشروع/الحلقة على كل بطاقة. النشر من هنا
// يفرض اختيار مشروع واحد على الأقل (يمكن اختيار أكثر من مشروع فيُنشر نفس
// المحتوى كمنشور مستقل لكل مشروع)، وإتاحة اختيار حلقة محددة فقط عند اختيار
// مشروع واحد بالضبط (الحلقات تابعة لمشروع واحد، فلا معنى لها مع اختيار متعدد).
export default function BehindScenesGlobalView({
  companyId,
  projects,
  episodes,
}: {
  companyId: string;
  projects: ProjectOption[];
  episodes: EpisodeOption[];
}) {
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [projectFilter, setProjectFilter] = useState("");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("behind_scenes_posts")
      .select(
        "*, author:profiles!author_id(full_name), project:projects(name), episode:episodes(title), comments:behind_scenes_comments(*, author:profiles!author_id(full_name)), likes:behind_scenes_likes(id)"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
    const rows = ((data ?? []) as Record<string, unknown>[]).map((p) => ({
      ...(p as unknown as BehindScenesPost),
      author_name: one<{ full_name: string | null }>(p.author as never)?.full_name ?? null,
      project_name: one<{ name: string | null }>(p.project as never)?.name ?? null,
      episode_title: one<{ title: string | null }>(p.episode as never)?.title ?? null,
      comments: ((p.comments as Record<string, unknown>[]) ?? []).map((c) => ({
        ...(c as unknown as BehindScenesComment),
        author_name: one<{ full_name: string | null }>(c.author as never)?.full_name ?? null,
      })),
      likes_count: ((p.likes as unknown[]) ?? []).length,
    })) as PostRow[];
    setPosts(rows);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل منشورات الكواليس الشاملة عند فتح الصفحة، النمط القياسي في هذا المشروع
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`bts-global:${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "behind_scenes_posts", filter: `company_id=eq.${companyId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "behind_scenes_comments", filter: `company_id=eq.${companyId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "behind_scenes_likes", filter: `company_id=eq.${companyId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load مُعاد إنشاؤه كل عرض عمداً ليقرأ companyId الحالي دوماً
  }, [companyId]);

  async function deletePost(id: string) {
    if (!confirm("حذف هذا المنشور نهائياً؟")) return;
    const supabase = createClient();
    await supabase.from("behind_scenes_posts").delete().eq("id", id);
    load();
  }

  const filtered = (posts ?? []).filter((p) => !projectFilter || p.project_id === projectFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الكواليس
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            كل منشورات الكواليس عبر كل المشاريع
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => setComposerOpen(true)}>
          <Icon name="plus" size={16} /> منشور جديد
        </button>
      </div>

      <select className="input-field" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={{ width: "auto", minWidth: 180 }}>
        <option value="">كل المشاريع</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {(composerOpen || editingPost) && (
        <PostComposer
          companyId={companyId}
          projects={projects}
          episodes={episodes}
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
        <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="sparkles" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد منشورات كواليس بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((p) => (
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
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {post.project_name && (
              <span className="chip chip-gold" style={{ fontSize: 10.5 }}>
                {post.project_name}
              </span>
            )}
            {post.episode_title && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {post.episode_title}</span>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{post.author_name ?? "عضو الفريق"}</div>
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
    </div>
  );
}

function PostComposer({
  companyId,
  projects,
  episodes,
  editingPost,
  onClose,
  onCreated,
}: {
  companyId: string;
  projects: ProjectOption[];
  episodes: EpisodeOption[];
  editingPost?: PostRow | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const isEditing = Boolean(editingPost);
  const [title, setTitle] = useState(editingPost?.title ?? "");
  const [body, setBody] = useState(editingPost?.body ?? "");
  const [shared, setShared] = useState(editingPost?.shared_with_client ?? false);
  const [media, setMedia] = useState<BehindScenesMediaItem[]>(editingPost?.media ?? []);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(editingPost ? [editingPost.project_id] : []);
  const [episodeId, setEpisodeId] = useState<string>(editingPost?.episode_id ?? "");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const singleProjectId = selectedProjectIds.length === 1 ? selectedProjectIds[0] : null;
  const availableEpisodes = singleProjectId ? episodes.filter((e) => e.project_id === singleProjectId) : [];

  function toggleProject(id: string) {
    setEpisodeId("");
    setSelectedProjectIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function uploadFiles(fileList: FileList | File[]) {
    for (const file of Array.from(fileList)) {
      setUploadingCount((c) => c + 1);
      try {
        const item = await uploadMediaFile(file, {
          companyId,
          projectId: selectedProjectIds[0] ?? "",
          episodeId: singleProjectId ? episodeId || null : null,
          pathPrefix: "behind-scenes/global",
        });
        if (!item) {
          setError("تعذّر رفع أحد الملفات");
          continue;
        }
        setMedia((prev) => [...prev, item]);
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
    if (!isEditing && selectedProjectIds.length === 0) {
      setError("اختر مشروعاً واحداً على الأقل.");
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
    const { error: insertError } = await supabase.from("behind_scenes_posts").insert(
      selectedProjectIds.map((projectId) => ({
        company_id: companyId,
        project_id: projectId,
        episode_id: singleProjectId === projectId ? episodeId || null : null,
        author_id: user?.id,
        title: title.trim() || null,
        body: body.trim() || null,
        media,
        shared_with_client: shared,
      }))
    );
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

        {!isEditing && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>المشاريع (اختر واحداً أو أكثر)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 140, overflowY: "auto", padding: 4, border: "1px solid var(--border)", borderRadius: 8 }}>
              {projects.map((p) => {
                const checked = selectedProjectIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="chip"
                    style={{
                      cursor: "pointer",
                      background: checked ? "rgba(var(--gold-rgb),0.12)" : undefined,
                      borderColor: checked ? "var(--gold)" : undefined,
                      color: checked ? "var(--gold)" : undefined,
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleProject(p.id)} style={{ accentColor: "var(--gold)" }} />
                    {p.name}
                  </label>
                );
              })}
            </div>
            {singleProjectId && availableEpisodes.length > 0 && (
              <select className="input-field" style={{ marginTop: 8 }} value={episodeId} onChange={(e) => setEpisodeId(e.target.value)}>
                <option value="">مستوى المشروع العام (بدون حلقة محددة)</option>
                {availableEpisodes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            )}
            {selectedProjectIds.length > 1 && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                عند اختيار أكثر من مشروع يُنشر نفس المحتوى كمنشور مستقل في كل مشروع، دون تحديد حلقة.
              </p>
            )}
          </div>
        )}

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
