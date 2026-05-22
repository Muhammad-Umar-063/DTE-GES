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
