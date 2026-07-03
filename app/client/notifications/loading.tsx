import { TitleSkeleton, ListSkeleton } from "@/app/components/client/skeletons";

export default function Loading() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: "0 auto" }}>
      <TitleSkeleton />
      <ListSkeleton count={6} height={70} />
    </div>
  );
}
