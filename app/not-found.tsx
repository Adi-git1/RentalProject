import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <p className="text-5xl font-semibold text-brand-600">404</p>
      <h1 className="mt-3 text-xl font-semibold text-ink">Page not found</h1>
      <p className="mt-1 text-sm text-muted">
        That link may be broken or the item is no longer listed.
      </p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/">Home</ButtonLink>
        <ButtonLink href="/browse" variant="secondary">
          Browse rentals
        </ButtonLink>
      </div>
    </Container>
  );
}
