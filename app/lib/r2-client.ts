import { S3Client } from "@aws-sdk/client-s3";

// عميل S3 متوافق مع Cloudflare R2 — للاستخدام على الخادم فقط (لا يُستورد أبداً
// في أي ملف "use client")، لأنه يحمل مفاتيح وصول سرّية. يُستخدم بدل Supabase
// Storage لملفات الفيديو الكبيرة تحديداً، لتفادي حد الحجم الصارم لخطة Supabase
// المجانية (50 ميجابايت لكل ملف).
export function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("إعدادات Cloudflare R2 غير مكتملة في متغيرات البيئة");
  }
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function r2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME غير مضبوط في متغيرات البيئة");
  return bucket;
}

// الرابط العام المباشر لملف داخل bucket عام (Public Development URL) — بلا
// أي توقيع أو صلاحية انتهاء، يعتمد أمنه فقط على عشوائية اسم الملف (uuid)، بنفس
// أسلوب مساحة public-assets في Supabase المستخدمة أصلاً لصور الكواليس وغيرها.
export function r2PublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) throw new Error("R2_PUBLIC_URL غير مضبوط في متغيرات البيئة");
  return `${base.replace(/\/+$/, "")}/${key}`;
}
