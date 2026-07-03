import { TitleSkeleton, ListSkeleton } from "@/app/components/client/skeletons";

export default function Loading() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
      <TitleSkeleton />
      <ListSkeleton count={4} height={90} />
    </div>
  );
}
