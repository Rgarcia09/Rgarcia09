"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Meta, User } from "@/lib/types";

interface SessionValue {
  user: User;
  meta: Meta;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User; meta: Meta } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A 401 from /me redirects to the sign-in page inside api().
    Promise.all([api<User>("/api/auth/me"), api<Meta>("/api/meta")])
      .then(([user, meta]) => setState({ user, meta }))
      .catch((e: Error) => setError(e.message));
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/login";
  }, []);

  if (error) return <div className="auth"><div className="notice error">{error}</div></div>;
  if (!state) return <div className="auth muted">Loading…</div>;
  return <SessionContext.Provider value={{ ...state, logout }}>{children}</SessionContext.Provider>;
}
