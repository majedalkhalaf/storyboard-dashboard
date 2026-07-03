import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// نسخة @ffmpeg/core أحادية الخيط المثبّتة فعلياً (وليس core-mt متعدد الخيوط) — عمداً:
// النسخة متعددة الخيوط تحتاج ترويسات Cross-Origin-Opener-Policy/Cross-Origin-Embedder-Policy
// على كامل الموقع، وهذا قد يكسر أي محتوى خارجي آخر مضمّن (معاينات PDF، صور من روابط خارجية...).
// الثمن: ضغط أبطأ نسبياً مما لو كان متعدد الخيوط، لكنه يعمل بلا أي تعديل على إعدادات الخادم.
const CORE_VERSION = "0.12.10";
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return loadPromise;
}

export interface CompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
}

/**
 * ضغط فيديو داخل المتصفح بالكامل عبر ffmpeg.wasm (بلا أي خادم تحويل — غير متوفر في هذا
 * التطبيق): تقليص الدقة إلى 1280px كحد أقصى (بلا تكبير للفيديوهات الأصغر) وإعادة ترميز
 * H.264/CRF 28، ما يقلّص الحجم بشكل كبير في أغلب الفيديوهات مقابل فقد جودة طفيف غير
 * ملحوظ عادة. قيد حقيقي يجب الإفصاح عنه: الفيديوهات الطويلة/الكبيرة جداً (عدة غيغابايت)
 * قد تفشل بسبب حدود ذاكرة المتصفح — لا حل بديل لهذا داخل المتصفح فقط.
 */
export async function compressVideo(file: File, onProgress?: (ratio: number) => void): Promise<CompressResult> {
  const ffmpeg = await getFfmpeg();
  const inputExt = (() => {
    const dot = file.name.lastIndexOf(".");
    return dot > -1 ? file.name.slice(dot) : ".mp4";
  })();
  const inputName = `input-${crypto.randomUUID()}${inputExt}`;
  const outputName = `output-${crypto.randomUUID()}.mp4`;

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", progressHandler);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      "scale='min(1280,iw)':-2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    // نسخ إلى Uint8Array جديد مضمون الدعم بـArrayBuffer عادي (لا SharedArrayBuffer) حتى يقبله مُنشئ File
    const bytes = new Uint8Array(data instanceof Uint8Array ? data : new TextEncoder().encode(data));
    const compressedFile = new File([bytes], file.name.replace(/\.[a-zA-Z0-9]+$/, "") + ".mp4", { type: "video/mp4" });
    return { file: compressedFile, originalSize: file.size, compressedSize: compressedFile.size };
  } finally {
    ffmpeg.off("progress", progressHandler);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
