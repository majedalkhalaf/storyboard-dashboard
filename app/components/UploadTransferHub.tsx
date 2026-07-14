"use client";

import { useEffect, useRef } from "react";
import TransferHub, { type TransferHubItem } from "@/app/components/ui/TransferHub";
import { useAllUploadItems, cancelItem, dismissItem, type QueueItem } from "@/app/lib/upload-queue-store";
import { humanFileSize, humanSpeed } from "@/app/components/projects/utils";

// غلاف رفيع يربط مخزن الرفع العام (upload-queue-store) بلوحة TransferHub العائمة
// — يُركَّب مرة واحدة في AppShell.tsx فيبقى ظاهراً عبر كل صفحات لوحة الفريق
// الداخلية، حتى لو انتقل المستخدم لمشروع أو قسم آخر أثناء رفع ملف كبير.
export default function UploadTransferHub() {
  const items = useAllUploadItems();
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    for (const item of items) {
      const isFinal = item.status === "success" || item.status === "cancelled" || item.status === "error";
      if (isFinal && !dismissTimers.current.has(item.id)) {
        const timer = setTimeout(
          () => {
            dismissItem(item.id);
            dismissTimers.current.delete(item.id);
          },
          item.status === "success" ? 3000 : 6000
        );
        dismissTimers.current.set(item.id, timer);
      }
    }
  }, [items]);

  const hubItems: TransferHubItem[] = items.map((item) => toHubItem(item));

  return <TransferHub title="عمليات الرفع" items={hubItems} onCancel={cancelItem} />;
}

function toHubItem(item: QueueItem): TransferHubItem {
  const percent = item.total > 0 ? Math.round((item.loaded / item.total) * 100) : 0;
  const status: TransferHubItem["status"] =
    item.status === "success" ? "success" : item.status === "error" ? "error" : item.status === "cancelled" ? "cancelled" : "active";

  let stage: string;
  if (item.status === "paused") stage = "مُتوقّف مؤقتاً";
  else if (item.status === "queued") stage = "بانتظار الدور...";
  else if (item.status === "uploading") stage = `${humanFileSize(item.loaded)} من ${humanFileSize(item.total)}${item.speedBps > 0 ? ` — ${humanSpeed(item.speedBps)}` : ""}`;
  else if (item.status === "success") stage = "اكتمل الرفع";
  else if (item.status === "cancelled") stage = "أُلغي الرفع";
  else stage = "فشل الرفع";

  return { id: item.id, label: item.file.name, stage, percent, status, error: item.error };
}
