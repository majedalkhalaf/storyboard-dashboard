"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";

// فيديو منشور (كواليس/عمل جاري) مع زر واضح لكتم/إلغاء كتم الصوت فوق الفيديو،
// بدل الاعتماد فقط على أيقونة الصوت الصغيرة داخل شريط تحكم المتصفح الافتراضي.
// يبدأ بلا كتم افتراضياً؛ الزر يبدّل الحالة فقط ولا يوقف/يشغّل الفيديو.
export default function VideoWithMuteToggle({ src, style }: { src: string; style?: React.CSSProperties }) {
  const [muted, setMuted] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <video src={src} controls playsInline muted={muted} style={{ display: "block", width: "100%", ...style }} />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((v) => !v);
        }}
        aria-label={muted ? "إلغاء كتم الصوت" : "كتم الصوت"}
        style={{
          position: "absolute",
          top: 10,
          insetInlineEnd: 10,
          padding: 7,
          borderRadius: 8,
          background: "rgba(0,0,0,0.6)",
          border: "none",
          color: "#fff",
          display: "flex",
          cursor: "pointer",
        }}
      >
        <Icon name={muted ? "volumeOff" : "volume"} size={15} />
      </button>
    </div>
  );
}
