import { TitleSkeleton, StatRowSkeleton, ListSkeleton } from "@/app/components/client/skeletons";

export default function Loading() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <TitleSkeleton />
      <StatRowSkeleton count={4} />
      <ListSkeleton count={4} height={180} />
    </div>
  );
}
