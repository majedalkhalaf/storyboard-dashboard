import { PageSkeleton } from "@/app/components/ui/PageSkeleton";

export default function Loading() {
  return <PageSkeleton statCount={4} rows={6} />;
}
