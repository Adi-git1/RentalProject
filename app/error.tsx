"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted">
        We hit an unexpected error. Try again, or head back home.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-medium text-ink hover:bg-surface"
        >
          Home
        </Link>
      </div>
    </Container>
  );
}
