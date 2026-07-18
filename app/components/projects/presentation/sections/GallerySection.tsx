import { Slide, SlideTitle, type SectionProps } from "./EasySections";

export default function GallerySection({ data, theme }: SectionProps) {
  const images = data.galleryImages;

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="لقطات من العمل">
        معرض الصور
      </SlideTitle>
      {images.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد صور بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, overflowY: "auto" }}>
          {images.map((img) => (
            <div key={img.id} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${theme.border}`, aspectRatio: "4 / 3" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}
