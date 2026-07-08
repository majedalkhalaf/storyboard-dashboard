"use client";

import type { ClientActivityEventType } from "@/app/lib/types";

// طبقة تتبّع خفيفة لنشاط العميل داخل بوابته — كل الكتابة مجمَّعة (Batch)
// ومؤجَّلة (Debounce) بدل طلب شبكة لكل حدث، وتُرسَل عبر sendBeacon عند
// إغلاق/مغادرة الصفحة لضمان وصولها. لا تتبّع خارج بوابة العميل إطلاقاً.

interface QueuedEvent {
  event_type: ClientActivityEventType;
  session_id?: string | null;
  page?: string | null;
  action?: string | null;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown>;
  project_id?: string | null;
  episode_id?: string | null;
}

const LOG_URL = "/api/client-portal/activity/log";
const HEARTBEAT_URL = "/api/client-portal/activity/heartbeat";
const SESSION_START_URL = "/api/client-portal/activity/session-start";
const SESSION_END_URL = "/api/client-portal/activity/session-end";
const SESSION_STORAGE_KEY = "cp_activity_session_id";
const FLUSH_DELAY_MS = 4000;
const MAX_QUEUE = 10;
const HEARTBEAT_MS = 60_000;

let sessionId: string | null = null;
let started = false;
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let currentPage: { page: string; projectId: string | null; episodeId: string | null; enteredAt: number } | null = null;

function postJson(url: string, data: unknown, useBeacon: boolean) {
  const body = JSON.stringify(data);
  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
  } else {
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}

function flush(useBeacon = false) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  postJson(LOG_URL, { events }, useBeacon);
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
}

function trackEvent(event: QueuedEvent) {
  queue.push({ ...event, session_id: sessionId });
  if (queue.length >= MAX_QUEUE) flush();
  else scheduleFlush();
}

function finalizeCurrentPage(at: number) {
  if (!currentPage) return;
  const durationSeconds = Math.max(0, Math.round((at - currentPage.enteredAt) / 1000));
  trackEvent({
    event_type: "page_view",
    page: currentPage.page,
    duration_seconds: durationSeconds,
    project_id: currentPage.projectId,
    episode_id: currentPage.episodeId,
  });
  currentPage = null;
}

// يُستخرَج project_id/episode_id تلقائياً من نمط رابط بوابة العميل، فلا حاجة
// لتمريرهما يدوياً من كل صفحة على حدة.
function extractIdsFromPath(pathname: string): { projectId: string | null; episodeId: string | null } {
  const match = pathname.match(/^\/client\/projects\/([^/]+)(?:\/episodes\/([^/]+))?/);
  return { projectId: match?.[1] ?? null, episodeId: match?.[2] ?? null };
}

/** يُستدعى مرة عند تركيب ClientShell (جذر بوابة العميل) — يبدأ/يستأنف جلسة ويشغّل النبضة الدورية. */
export function startActivityTracking() {
  if (typeof window === "undefined" || started) return;
  started = true;

  const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    sessionId = stored;
  } else {
    fetch(SESSION_START_URL, { method: "POST" })
      .then((r) => r.json())
      .then((json: { sessionId?: string }) => {
        if (json.sessionId) {
          sessionId = json.sessionId;
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, json.sessionId);
        }
      })
      .catch(() => {});
  }

  heartbeatTimer = setInterval(() => {
    if (!sessionId || document.visibilityState !== "visible") return;
    fetch(HEARTBEAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      keepalive: true,
    }).catch(() => {});
  }, HEARTBEAT_MS);

  const onHide = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    finalizeCurrentPage(Date.now());
    flush(true);
    if (sessionId) postJson(SESSION_END_URL, { sessionId }, true);
  };
  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      finalizeCurrentPage(Date.now());
      flush(true);
    }
  });
}

/** يُستدعى عند كل تغيّر مسار داخل بوابة العميل. */
export function trackPageView(pathname: string) {
  const now = Date.now();
  finalizeCurrentPage(now);
  const { projectId, episodeId } = extractIdsFromPath(pathname);
  currentPage = { page: pathname, projectId, episodeId, enteredAt: now };
}

export function trackFileDownload(fileName: string, fileId?: string | null, opts?: { projectId?: string | null; episodeId?: string | null }) {
  trackEvent({
    event_type: "file_download",
    page: currentPage?.page ?? null,
    metadata: { fileName, fileId: fileId ?? null },
    project_id: opts?.projectId ?? currentPage?.projectId ?? null,
    episode_id: opts?.episodeId ?? currentPage?.episodeId ?? null,
  });
}

export function trackVideoWatch(
  fileId: string,
  watchedSeconds: number,
  totalSeconds: number,
  opts?: { projectId?: string | null; episodeId?: string | null }
) {
  trackEvent({
    event_type: "video_watch",
    page: currentPage?.page ?? null,
    metadata: {
      fileId,
      watchedSeconds: Math.round(watchedSeconds),
      totalSeconds: Math.round(totalSeconds),
      percent: totalSeconds > 0 ? Math.round((watchedSeconds / totalSeconds) * 100) : 0,
    },
    project_id: opts?.projectId ?? currentPage?.projectId ?? null,
    episode_id: opts?.episodeId ?? currentPage?.episodeId ?? null,
  });
}
