import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-12">
      <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        Sign in to book, track your rentals, and download receipts.
      </p>
      <div className="mt-6">
        <Suspense fallback={<div className="skeleton h-72 rounded-xl" />}>
          <LoginForm />
        </Suspense>
      </div>
    </Container>
  );
}
