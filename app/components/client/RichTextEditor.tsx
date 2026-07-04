"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import Icon from "@/app/components/ui/Icon";

// محرر نص منسّق خفيف — بلا مكتبة خارجية ثقيلة، فقط contentEditable + أوامر
// تنسيق قياسية (execCommand، لا تزال مدعومة في كل المتصفحات الحديثة لهذا
// الاستخدام البسيط)، مع تعقيم صارم للمخرجات (DOMPurify) قبل تمريرها للأعلى
// وعند أي عرض لاحق — الوسوم المسموحة فقط: عريض/مائل/تسطير وقوائم نقطية ومرقّمة.
const SANITIZE_CONFIG = { ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "ul", "ol", "li", "br", "p", "div"], ALLOWED_ATTR: [] };

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html || "", SANITIZE_CONFIG);
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (ref.current && !initialized.current) {
      ref.current.innerHTML = sanitizeRichText(value);
      initialized.current = true;
    }
  }, [value]);

  function handleInput() {
    if (!ref.current) return;
    onChange(sanitizeRichText(ref.current.innerHTML));
  }

  function exec(command: string) {
    ref.current?.focus();
    document.execCommand(command);
    handleInput();
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--bg-primary)" }}>
      <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        <ToolbarButton label="عريض" onClick={() => exec("bold")}>
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton label="مائل" onClick={() => exec("italic")}>
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton label="تسطير" onClick={() => exec("underline")}>
          <u>U</u>
        </ToolbarButton>
        <span style={{ width: 1, background: "var(--border)", margin: "2px 4px" }} />
        <ToolbarButton label="قائمة نقطية" onClick={() => exec("insertUnorderedList")}>
          <Icon name="list" size={15} />
        </ToolbarButton>
        <ToolbarButton label="قائمة مرقّمة" onClick={() => exec("insertOrderedList")}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>1.</span>
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="rich-text-editable"
        style={{ minHeight: 110, maxHeight: 320, overflowY: "auto", padding: "10px 12px", fontSize: 14, lineHeight: 1.7, outline: "none" }}
      />
    </div>
  );
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="btn btn-ghost"
      style={{ padding: "4px 9px", fontSize: 13, minWidth: 30, justifyContent: "center" }}
    >
      {children}
    </button>
  );
}
