import { ClientPageSkeleton } from "@/app/components/client/skeletons";

export default function Loading() {
  return <ClientPageSkeleton statCount={6} cards={3} />;
}
