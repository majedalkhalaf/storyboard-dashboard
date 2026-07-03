// يحوّل رابط فيديو خارجي (YouTube/Vimeo) إلى رابط تضمين (embed) قابل للعرض داخل iframe،
// أو يُرجع null إن كان رابطاً مباشراً لملف فيديو (يُعرض حينها بعنصر <video> عادي) أو رابطاً
// غير معروف الصيغة (يُعامل كرابط خارجي عادي بدل تضمينه).
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.pathname === "/watch" ? u.searchParams.get("v") : u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : null;
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

/** رابط لملف فيديو مباشر (يمكن تشغيله بعنصر <video> عادي) بحسب الامتداد */
export function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
}
