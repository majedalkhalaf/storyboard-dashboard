"use client";

import { useSyncExternalStore } from "react";

// مخزن رفع مستقل عن دورة حياة أي مكوّن React — الرفعات الفعلية (fetch/XHR/tus) كانت
// أصلاً تعمل بمعزل عن React (إغلاقات JS خالصة)، لكن تتبّع تقدّمها وأزرار التحكم بها
// كانت محصورة في useState/useRef داخل FilesPanel، فتُفقد بمجرد تبديل التبويب (unmount
// كامل للمكوّن). نقل الحالة إلى هذا المخزن على مستوى الوحدة (module scope) يجعلها
// تنجو من أي تبديل تبويب، وأي نسخة من FilesPanel تُعاد تركيبها تلتقط نفس الحالة الحية.

export type QueueStatus = "queued" | "uploading" | "paused" | "success" | "error" | "cancelled";

export interface QueueItem {
  id: string;
  scopeKey: string;
  file: File;
  status: QueueStatus;
  loaded: number;
  total: number;
  speedBps: number;
  error?: string;
}

interface Controller {
  cancel: () => void;
  pause?: () => void;
  resume?: () => void;
}

interface InternalItem extends QueueItem {
  controller?: Controller;
  started: boolean;
  speedTrack?: { time: number; loaded: number };
}

const items = new Map<string, InternalItem>();
const listeners = new Set<() => void>();
let version = 0;
const scopeCache = new Map<string, { version: number; list: QueueItem[] }>();

function notify() {
  version++;
  for (const l of listeners) l();
}

function toPublic(i: InternalItem): QueueItem {
  return { id: i.id, scopeKey: i.scopeKey, file: i.file, status: i.status, loaded: i.loaded, total: i.total, speedBps: i.speedBps, error: i.error };
}

export function scopeKeyFor(projectId: string, episodeId: string | null): string {
  return `${projectId}:${episodeId ?? "none"}`;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(scopeKey: string): QueueItem[] {
  const cached = scopeCache.get(scopeKey);
  if (cached && cached.version === version) return cached.list;
  const list = Array.from(items.values())
    .filter((i) => i.scopeKey === scopeKey)
    .map(toPublic);
  scopeCache.set(scopeKey, { version, list });
  return list;
}

/** يُستخدم داخل مكوّنات "use client" — يُعيد قائمة الرفعات الحية لنطاق معيّن، وتبقى محدَّثة تلقائياً حتى لو تبدّل التبويب وأُعيد تركيب المكوّن. */
export function useUploadQueue(scopeKey: string): QueueItem[] {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(scopeKey),
    () => []
  );
}

export function enqueueFiles(scopeKey: string, files: File[]): string[] {
  const ids: string[] = [];
  for (const file of files) {
    const id = crypto.randomUUID();
    items.set(id, { id, scopeKey, file, status: "queued", loaded: 0, total: file.size, speedBps: 0, started: false });
    ids.push(id);
  }
  notify();
  return ids;
}

export function getItem(id: string): QueueItem | undefined {
  const i = items.get(id);
  return i ? toPublic(i) : undefined;
}

/** يحاول "حجز" بدء رفع عنصر معيّن — يُعيد false إن كان قد بدأ فعلاً (يمنع بدءاً مزدوجاً عند إعادة تركيب أكثر من نسخة من اللوحة على نفس النطاق) */
export function tryMarkStarted(id: string): boolean {
  const item = items.get(id);
  if (!item || item.started) return false;
  item.started = true;
  return true;
}

export function setController(id: string, controller: Controller) {
  const item = items.get(id);
  if (item) item.controller = controller;
}

export function updateProgress(id: string, loaded: number, total: number) {
  const item = items.get(id);
  if (!item) return;
  const now = Date.now();
  let speedBps = item.speedBps;
  if (item.speedTrack) {
    const dt = (now - item.speedTrack.time) / 1000;
    if (dt >= 0.5) {
      speedBps = Math.max(0, (loaded - item.speedTrack.loaded) / dt);
      item.speedTrack = { time: now, loaded };
    }
  } else {
    item.speedTrack = { time: now, loaded };
  }
  item.loaded = loaded;
  item.total = total;
  item.speedBps = speedBps;
  notify();
}

export function setStatus(id: string, status: QueueStatus, error?: string) {
  const item = items.get(id);
  if (!item) return;
  item.status = status;
  item.error = error;
  notify();
}

export function pauseItem(id: string) {
  items.get(id)?.controller?.pause?.();
  setStatus(id, "paused");
}

export function resumeItem(id: string) {
  items.get(id)?.controller?.resume?.();
  setStatus(id, "uploading");
}

export function cancelItem(id: string) {
  const item = items.get(id);
  item?.controller?.cancel();
  if (item) item.started = false;
  setStatus(id, "cancelled");
}

export function retryItem(id: string) {
  const item = items.get(id);
  if (!item) return;
  item.started = false;
  item.controller = undefined;
  item.loaded = 0;
  item.error = undefined;
  item.status = "queued";
  notify();
}

export function dismissItem(id: string) {
  items.delete(id);
  notify();
}

/** يُبث عند اكتمال حفظ بيانات ملف في قاعدة البيانات بعد نجاح الرفع — تستمع له أي
 * نسخة حالية من FilesPanel على نفس النطاق لتحديث قائمة الملفات فوراً، حتى لو كانت
 * النسخة التي بدأت الرفع فعلياً قد أُلغيت تركيبها (تبديل تبويب أثناء الرفع). */
export function broadcastFilesChanged(scopeKey: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("upload-finalized", { detail: { scopeKey } }));
}

export function onFilesChanged(scopeKey: string, handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    if ((e as CustomEvent<{ scopeKey: string }>).detail?.scopeKey === scopeKey) handler();
  };
  window.addEventListener("upload-finalized", listener);
  return () => window.removeEventListener("upload-finalized", listener);
}
