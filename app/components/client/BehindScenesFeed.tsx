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

// أحجام متفاوتة لأربع بطاقات فقط — أكبرها أصغر بوضوح من بطاقة المشروع
// (340px+ عرضاً و170px ارتفاع الغلاف وحده، دون احتساب النص والأزرار أسفلها).
const CARD_SIZES = [
  { width: 140, height: 112 },
  { width: 185, height: 140 },
  { width: 160, height: 125 },
  { width: 200, height: 150 },
];
// نطاق أوسع من المنشورات/الوسائط هنا — المجموعة تُستخدم كـ"مسبح" عشوائي للتبديل
// (Slideshow) وليس فقط أول عناصر تُعرض مباشرة، فكلما اتسع المسبح قلّ التكرار
// الملحوظ بين الشرائح المتجاورة.
const MAX_POSTS_SCANNED = 8;
const MAX_MEDIA_CARDS = 20;
const SLOT_COUNT = 4;
const MIN_SLIDE_INTERVAL_MS = 4000;
const MAX_SLIDE_INTERVAL_MS = 7500;

interface StripMediaCard {
  key: string;
  post: BehindScenesFeedPost;
  media: BehindScenesMediaItem | null;
}

// يفكّك المنشورات إلى بطاقة واحدة لكل صورة/فيديو بدل بطاقة واحدة تمثّل الغلاف
// فقط — هذا ما يجعل منشوراً واحداً يحتوي عدة صور يُغذّي مسبح التبديل العشوائي
// بخيارات أكثر بدل الاقتصار على غلاف واحد لكل منشور.
function flattenPostsToMediaCards(posts: BehindScenesFeedPost[]): StripMediaCard[] {
  const out: StripMediaCard[] = [];
  for (const post of posts.slice(0, MAX_POSTS_SCANNED)) {
    const media = post.media.length > 0 ? post.media : [null];
    for (const m of media) {
      if (out.length >= MAX_MEDIA_CARDS) return out;
      out.push({ key: `${post.id}-${m?.url ?? "none"}`, post, media: m });
    }
  }
  return out;
}

// كل خانة تحتفظ بفهرس عشوائي خاص بها ضمن مسبح الوسائط، وتُبدّله في فواصل
// زمنية عشوائية غير متزامنة بين الخانات — بلا أي تمرير أفقي، بحسب طلب صريح
// بتثبيت الشريط مكانه بدل تحريكه، مع إبقاء التغيّر التلقائي بين الصور نفسها.
function useRandomSlideIndex(poolLength: number, seed: number) {
  const [index, setIndex] = useState(() => (poolLength > 0 ? seed % poolLength : 0));

  useEffect(() => {
    if (poolLength <= 1) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = MIN_SLIDE_INTERVAL_MS + Math.random() * (MAX_SLIDE_INTERVAL_MS - MIN_SLIDE_INTERVAL_MS);
      timer = setTimeout(() => {
        if (cancelled) return;
        setIndex((prev) => {
          let next = Math.floor(Math.random() * poolLength);
          if (next === prev) next = (next + 1) % poolLength;
          return next;
        });
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [poolLength]);

  return poolLength > 0 ? index % poolLength : 0;
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

// شريط "الكواليس" — عرضي ومضغوط أسفل بطاقات المشاريع بدل مساحة كبيرة أعلى
// الصفحة، بخانات ثابتة المكان (بلا أي تمرير) متفاوتة الحجم، تتبدّل صورة كل
// خانة عشوائياً بين الحين والآخر من كل كواليس حلقات المشروع — بدل حركة تمرير
// أفقي مستمرة، بناءً على طلب صريح بتثبيت الشريط مكانه. الضغط على أي خانة
// يفتح المنشور المرتبط بالصورة المعروضة فيها حالياً كاملاً بالتفاصيل والتفاعل.
export default function BehindScenesFeed({ posts, currentUserId, currentUserName }: { posts: BehindScenesFeedPost[]; currentUserId: string; currentUserName: string | null }) {
  useBehindScenesRealtime();
  const [openPost, setOpenPost] = useState<BehindScenesFeedPost | null>(null);
  if (posts.length === 0) return null;

  const pool = flattenPostsToMediaCards(posts);

  return (
    <div style={{ marginTop: 24, marginBottom: 6 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, display: "flex", alignItems: "center", gap: 7, color: "var(--text-secondary)" }}>
        <Icon name="sparkles" size={15} className="nav-icon" />
        الكواليس
      </h2>
      <div className="bts-strip">
        <div className="bts-strip-track">
          {Array.from({ length: SLOT_COUNT }, (_, slotIndex) => (
            <SlideshowSlot key={slotIndex} slotIndex={slotIndex} pool={pool} onOpen={setOpenPost} />
          ))}
        </div>
      </div>

      {openPost && (
        <div className="modal-overlay" onClick={() => setOpenPost(null)}>
          <div className="modal-content" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <PostDetail post={openPost} currentUserId={currentUserId} currentUserName={currentUserName} />
          </div>
        </div>
      )}
    </div>
  );
}

function SlideshowSlot({ slotIndex, pool, onOpen }: { slotIndex: number; pool: StripMediaCard[]; onOpen: (post: BehindScenesFeedPost) => void }) {
  const size = CARD_SIZES[slotIndex % CARD_SIZES.length];
  // بذرة بداية مختلفة لكل خانة كي لا تعرض كل الخانات نفس الصورة في البداية.
  const randomIndex = useRandomSlideIndex(pool.length, slotIndex * 3 + 1);
  const item = pool.length > 0 ? pool[randomIndex % pool.length] : null;
  const media = item?.media ?? null;

  return (
    <button
      className="bts-strip-card"
      onClick={() => item && onOpen(item.post)}
      style={{ width: size.width, height: size.height, animationDelay: `${slotIndex * 70}ms` }}
    >
      <div key={item?.key ?? "empty"} className="bts-slide-fade" style={{ position: "absolute", inset: 0 }}>
        {media ? (
          media.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt={media.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : media.type === "video" ? (
            <video src={media.url} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-hover)" }}>
              <Icon name="mic" size={22} className="nav-icon" />
            </div>
          )
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-hover)" }}>
            <Icon name="sparkles" size={22} className="nav-icon" />
          </div>
        )}
      </div>

      {media?.type === "video" && (
        <span
          style={{
            position: "absolute",
            top: "50%",
            insetInlineStart: "50%",
            transform: "translate(-50%,-50%)",
            background: "rgba(0,0,0,0.55)",
            borderRadius: "50%",
            padding: 6,
            display: "flex",
            color: "#fff",
          }}
        >
          <Icon name="play" size={14} />
        </span>
      )}

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)" }} />
      <span
        className="bts-strip-card-expand"
        style={{
          position: "absolute",
          top: 8,
          insetInlineEnd: 8,
          background: "rgba(0,0,0,0.5)",
          borderRadius: "50%",
          padding: 5,
          display: "flex",
          color: "#fff",
        }}
      >
        <Icon name="export" size={12} />
      </span>
      <div style={{ position: "absolute", bottom: 8, insetInlineStart: 10, insetInlineEnd: 10, textAlign: "start" }}>
        <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {projectHashtag(item?.post.projectName ?? "")}
        </div>
        <div style={{ fontSize: 11.5, color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item?.post.title ?? "كواليس"}</div>
      </div>
    </button>
  );
}

function PostDetail({ post, currentUserId, currentUserName }: { post: BehindScenesFeedPost; currentUserId: string; currentUserName: string | null }) {
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
    <div>
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
