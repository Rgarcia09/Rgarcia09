"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Meta } from "@/lib/types";
import { ErrorNotice, Field } from "@/components/ui";

function safeNext(value: string | null): string {
  // Only allow same-site relative paths to prevent open redirects.
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function LoginForm() {
  const params = useSearchParams();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { json: { email, password } });
      window.location.href = safeNext(params.get("next"));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const name = meta?.ava_name ?? "AVA";
  return (
    <main className="auth">
      <form className="auth-card card" onSubmit={onSubmit}>
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-name">{name.toUpperCase()}</span>
          <span className="brand-office">{meta?.office_name ?? "Internal office assistant"}</span>
        </div>
        <ErrorNotice error={error} />
        <Field label="Email">
          <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted small" style={{ margin: 0 }}>
          Each employee signs in with an individual account. Ask an administrator if you need one.
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
