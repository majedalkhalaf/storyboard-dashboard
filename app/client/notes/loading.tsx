import { TitleSkeleton, ListSkeleton } from "@/app/components/client/skeletons";

export default function Loading() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <TitleSkeleton />
      <ListSkeleton count={5} height={90} />
    </div>
  );
}
