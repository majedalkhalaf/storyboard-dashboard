"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { MediaGallery } from "@/app/components/projects/sections/ProjectBehindScenesSection";
import { createClient } from "@/app/lib/supabase/client";
import { relativeTime, projectHashtag } from "@/app/components/client/utils";
import type { BehindScenesComment, BehindScenesMediaItem } from "@/app/lib/types";

export interface BehindScenesFeedPost {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  authorName: string | null;
  title: string | null;
  body: string | null;
  media: BehindScenesMediaItem[];
  createdAt: string;
  likesCount: number;
  hasLiked: boolean;
  allowLikes: boolean;
  allowComments: boolean;
  comments: BehindScenesComment[];
}

// يستمع لأي منشور كواليس جديد مشترك عبر كل مشاريع العميل النشطة ويعيد جلب
// بيانات الصفحة — بلا فلترة على مستوى القناة لأن Realtime لا يدعم فلترة
// project_id ضمن قائمة، بنفس النمط المتّبع أصلاً في مزامنة المشاريع (ClientDashboard).
function useBehindScenesRealtime() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("client-behind-scenes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "behind_scenes_posts" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router مستقر عبر عمر المكوّن
  }, []);
}

export default function BehindScenesFeed({ posts, currentUserId, currentUserName }: { posts: BehindScenesFeedPost[]; currentUserId: string; currentUserName: string | null }) {
  useBehindScenesRealtime();
  if (posts.length === 0) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="sparkles" size={17} className="nav-icon" />
        الكواليس
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {posts.map((p) => (
          <PostCard key={p.id} post={p} currentUserId={currentUserId} currentUserName={currentUserName} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId, currentUserName }: { post: BehindScenesFeedPost; currentUserId: string; currentUserName: string | null }) {
  const [liked, setLiked] = useState(post.hasLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [comments, setComments] = useState(post.comments);
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    if (!post.allowLikes || busy) return;
    setBusy(true);
    const supabase = createClient();
    if (liked) {
      setLiked(false);
      setLikesCount((c) => Math.max(0, c - 1));
      await supabase.from("behind_scenes_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    } else {
      setLiked(true);
      setLikesCount((c) => c + 1);
      await supabase.from("behind_scenes_likes").insert({ post_id: post.id, company_id: post.companyId, project_id: post.projectId, user_id: currentUserId });
    }
    setBusy(false);
  }

  async function submitComment() {
    const trimmed = commentBody.trim();
    if (!trimmed || !post.allowComments || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("behind_scenes_comments")
      .insert({ post_id: post.id, company_id: post.companyId, project_id: post.projectId, author_id: currentUserId, author_role: "client", body: trimmed })
      .select("*")
      .single();
    setBusy(false);
    if (!error && data) {
      setComments((prev) => [...prev, data as BehindScenesComment]);
      setCommentBody("");
    }
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700, marginBottom: 3 }}>{projectHashtag(post.projectName)}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{post.authorName ?? "فريق العمل"}</div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(post.createdAt)}</div>
      </div>

      {post.title && <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 6 }}>{post.title}</h3>}
      {post.body && <p style={{ fontSize: 14, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: post.media.length ? 12 : 0 }}>{post.body}</p>}

      {post.media.length > 0 && <MediaGallery media={post.media} variant="full" />}

      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        {post.allowLikes && (
          <button
            onClick={toggleLike}
            className="btn btn-ghost"
            style={{ fontSize: 12.5, padding: "5px 10px", color: liked ? "var(--gold)" : undefined, fontWeight: liked ? 700 : 400 }}
          >
            <Icon name="star" size={15} /> {likesCount > 0 ? likesCount : ""} إعجاب
          </button>
        )}
        {post.allowComments && (
          <span style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="message" size={15} /> {comments.length} تعليق
          </span>
        )}
      </div>

      {comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ fontSize: 13, background: "var(--bg-secondary)", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontWeight: 700 }}>{c.author_id === currentUserId ? currentUserName || "أنت" : c.author_role === "client" ? "عميل آخر" : "فريق العمل"}</span>{" "}
              <span style={{ color: "var(--text-secondary)" }}>{c.body}</span>
            </div>
          ))}
        </div>
      )}

      {post.allowComments && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            className="input-field"
            placeholder="اكتب تعليقاً..."
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
          />
          <button className="btn btn-gold" style={{ flexShrink: 0 }} onClick={submitComment} disabled={busy || !commentBody.trim()}>
            <Icon name="send" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
