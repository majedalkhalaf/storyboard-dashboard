"use client";

import { useSyncExternalStore } from "react";

// مخزن تنزيل مستقل عن دورة حياة أي مكوّن React — بنفس فكرة upload-queue-store.ts
// تماماً: التنزيل الفعلي (fetch بتقدّم بايت حقيقي) يعمل بمعزل عن React، لكن قبل هذا
// المخزن كانت حالته (loadingId/progressById) محصورة في useState داخل كل مكوّن على
// حدة، فتختفي بصرياً بمجرد الانتقال لقسم آخر (رغم أن التنزيل نفسه لا يتوقف فعلياً).
// نقل الحالة لمستوى الوحدة (module scope) هنا يجعلها مرئية من أي مكان في التطبيق عبر
// لوحة عائمة واحدة (TransferHub)، ويضيف إلغاءً حقيقياً عبر AbortController محفوظ هنا.

export type DownloadStatus = "active" | "success" | "error" | "cancelled";

export interface DownloadItem {
  id: string;
  label: string;
  stage: string;
  percent: number;
  status: DownloadStatus;
  error?: string;
}

interface InternalItem extends DownloadItem {
  abort?: () => void;
}

const items = new Map<string, InternalItem>();
const listeners = new Set<() => void>();
let version = 0;
let cachedVersion = -1;
let cachedList: DownloadItem[] = [];

function notify() {
  version++;
  for (const l of listeners) l();
}

function toPublic(i: InternalItem): DownloadItem {
  return { id: i.id, label: i.label, stage: i.stage, percent: i.percent, status: i.status, error: i.error };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DownloadItem[] {
  if (cachedVersion === version) return cachedList;
  cachedList = Array.from(items.values())
    .map(toPublic)
    .sort((a, b) => (a.id < b.id ? 1 : -1));
  cachedVersion = version;
  return cachedList;
}

/** يُستخدم داخل مكوّنات "use client" — يُعيد كل عمليات التنزيل الجارية/الأخيرة عبر
 * التطبيق بأكمله (لا نطاق محدود)، لعرضها في لوحة عائمة واحدة ثابتة الظهور. */
export function useDownloadQueue(): DownloadItem[] {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => []
  );
}

function startDownloadItem(label: string): string {
  const id = crypto.randomUUID();
  items.set(id, { id, label, stage: "جارٍ التحضير...", percent: 0, status: "active" });
  notify();
  return id;
}

function updateDownloadProgress(id: string, stage: string, percent: number) {
  const item = items.get(id);
  if (!item || item.status !== "active") return;
  item.stage = stage;
  item.percent = Math.max(0, Math.min(100, Math.round(percent)));
  notify();
}

function finishDownloadItem(id: string, status: "success" | "error" | "cancelled", error?: string) {
  const item = items.get(id);
  if (!item) return;
  item.status = status;
  item.error = error;
  if (status === "success") item.percent = 100;
  notify();
  // إزالة تلقائية بعد فترة قصيرة كي لا تتراكم عناصر منتهية في اللوحة العائمة إلى الأبد
  setTimeout(() => {
    items.delete(id);
    notify();
  }, status === "success" ? 3000 : 6000);
}

export function cancelDownloadItem(id: string) {
  const item = items.get(id);
  if (!item || item.status !== "active") return;
  item.abort?.();
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

// خطأ Chromium معروف (NotReadableError) يظهر أحياناً عند تجميع Blob كبير جداً
// (أرشيف ZIP يضمّ فيديوهات ضخمة) — المتصفح يخزّن أجزاء الـ Blob داخلياً على القرص
// مؤقتاً، وإن فشل الوصول لهذا التخزين المؤقت (غالباً بسبب امتلاء مساحة التخزين أو
// ضغط على الذاكرة) يُلقي هذا الخطأ رغم أن كل بايتات الملف وصلت فعلياً بنجاح عبر
// الشبكة. الخطأ عابر في أغلب الحالات، فإعادة محاولة واحدة تلقائية كافية غالباً.
function isTransientBlobError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "NotReadableError") return true;
  const msg = err instanceof Error ? err.message : "";
  return msg.includes("could not be read") || msg.includes("reference to a file was acquired");
}

function friendlyErrorMessage(err: unknown): string {
  if (isTransientBlobError(err)) {
    return "تعذّر إكمال التنزيل بسبب خطأ مؤقت من المتصفح — يُرجى التأكد من توفر مساحة تخزين كافية على جهازك ثم إعادة المحاولة.";
  }
  return err instanceof Error ? err.message : "تعذّر التنزيل";
}

/** يلفّ أي عملية تنزيل/تصدير بتسجيلها في المخزن العام (تظهر في اللوحة العائمة
 * فوراً وتبقى مرئية بغضّ النظر عن الصفحة الحالية)، ويمنحها AbortController حقيقياً
 * يُستدعى عند ضغط المستخدم على "×" في اللوحة العائمة. */
// عدد محاولات إعادة المحاولة القصوى بعد خطأ Blob العابر — أرشيفات الحلقات
// التي تضمّ عدة فيديوهات كبيرة أثبتت فعلياً أن محاولة واحدة إضافية غير كافية
// دائماً؛ 2 إعادة محاولة (3 محاولات إجمالاً) مع مهلة قصيرة بينها تمنح متصفح
// Chrome فرصة أفضل لتحرير تخزين الـ Blob المؤقت قبل إعادة المحاولة.
const MAX_TRANSIENT_RETRIES = 2;
const RETRY_COOLDOWN_MS = 1200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runTrackedDownload(
  label: string,
  task: (ctx: { signal: AbortSignal; onProgress: (stage: string, percent: number) => void }) => Promise<void>
): Promise<void> {
  const id = startDownloadItem(label);
  const controller = new AbortController();
  const item = items.get(id);
  if (item) item.abort = () => controller.abort();

  async function attempt(attemptNumber: number): Promise<void> {
    if (attemptNumber > 0) updateDownloadProgress(id, `إعادة المحاولة بعد خطأ مؤقت... (${attemptNumber}/${MAX_TRANSIENT_RETRIES})`, 0);
    await task({ signal: controller.signal, onProgress: (stage, percent) => updateDownloadProgress(id, stage, percent) });
  }

  try {
    for (let i = 0; i <= MAX_TRANSIENT_RETRIES; i++) {
      try {
        await attempt(i);
        break;
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err) || !isTransientBlobError(err) || i === MAX_TRANSIENT_RETRIES) {
          throw err;
        }
        await delay(RETRY_COOLDOWN_MS);
      }
    }
    finishDownloadItem(id, "success");
  } catch (err) {
    if (controller.signal.aborted || isAbortError(err)) {
      finishDownloadItem(id, "cancelled");
      return;
    }
    finishDownloadItem(id, "error", friendlyErrorMessage(err));
    throw err;
  }
}
