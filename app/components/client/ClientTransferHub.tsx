"use client";

import TransferHub from "@/app/components/ui/TransferHub";
import { useDownloadQueue, cancelDownloadItem } from "@/app/lib/download-queue-store";

// غلاف رفيع يربط مخزن التنزيل العام بلوحة TransferHub العائمة — يُركَّب مرة واحدة
// في ClientShell.tsx (تخطيط بوابة العميل الجذري) فيبقى ظاهراً عبر كل صفحات
// البوابة، بما فيها الانتقال بين المشاريع والحلقات أثناء تنزيل جارٍ.
export default function ClientTransferHub() {
  const items = useDownloadQueue();
  return <TransferHub title="التنزيلات" items={items} onCancel={cancelDownloadItem} />;
}
