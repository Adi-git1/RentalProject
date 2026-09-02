import { Container, Skeleton } from "@/components/ui/primitives";

export default function ItemLoading() {
  return (
    <Container className="py-8">
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <Skeleton className="aspect-[4/3] w-full rounded-[var(--radius-card)]" />
          <Skeleton className="mt-6 h-7 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
        <Skeleton className="h-96 w-full rounded-[var(--radius-card)]" />
      </div>
    </Container>
  );
}
