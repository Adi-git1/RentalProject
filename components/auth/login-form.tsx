"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/primitives";
import { SITE_URL } from "@/lib/constants";

type Mode = "magic" | "password";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    params.get("error") ? "That sign-in link was invalid or expired. Try again." : null,
  );

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    const fn = isSignUp
      ? supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })
      : supabase.auth.signInWithPassword({ email, password });
    const { data, error } = await fn;
    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }
    if (isSignUp && !data.session) {
      setStatus("sent");
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-sm text-ink">
        <p className="font-medium">Check your email</p>
        <p className="mt-1 text-muted">
          We sent a {mode === "magic" ? "sign-in link" : "confirmation link"} to{" "}
          <strong>{email}</strong>. Open it on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-full bg-surface p-1 text-sm">
        {(["magic", "password"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 font-medium ${
              mode === m ? "bg-white text-ink shadow-sm" : "text-muted"
            }`}
          >
            {m === "magic" ? "Email link" : "Password"}
          </button>
        ))}
      </div>

      {mode === "magic" ? (
        <form onSubmit={sendMagicLink} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitPassword} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Password" hint={isSignUp ? "At least 6 characters." : undefined}>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => setIsSignUp((v) => !v)}
            className="w-full text-center text-xs text-brand-700 hover:underline"
          >
            {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </form>
      )}
    </div>
  );
}
