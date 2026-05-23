"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Never surface raw provider errors to the user.
      setError("Email or password is incorrect.");
      setPending(false);
      return;
    }

    // Record the sign-in in the user_sessions audit table. We await this so the
    // row is on disk before the redirect (matters if the next page is /audit).
    // Failures here are non-blocking — auth succeeded; we don't want a session
    // log hiccup to block the user from reaching the app.
    try {
      await fetch("/api/auth/log-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "sign_in" }),
      });
    } catch {
      // ignore — sign-in still succeeded
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="text-label block mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary"
          disabled={pending}
        />
      </div>

      <div>
        <label htmlFor="password" className="text-label block mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary"
          disabled={pending}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="text-body text-red bg-red-light border border-red/20 rounded-input px-3 py-2"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-white text-card-title rounded-button py-2.5 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
