"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { NAV } from "./nav";
import { useSession } from "./session";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, meta, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="shell">
      <aside className={`sidebar${open ? " open" : ""}`} onClick={() => setOpen(false)}>
        <div className="brand">
          <span className="brand-name">{meta.ava_name.toUpperCase()}</span>
          <span className="brand-office">{meta.office_name}</span>
        </div>
        {NAV.map((group, i) => (
          <nav className="nav-group" key={i} aria-label={group.heading ?? "Main"}>
            {group.heading && <div className="nav-heading">{group.heading}</div>}
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive(pathname, item.href) ? " active" : ""}${item.plannedPhase ? " planned" : ""}`}
              >
                <span>{item.label}</span>
                {item.plannedPhase && <span className="nav-badge">Phase {item.plannedPhase}</span>}
              </Link>
            ))}
          </nav>
        ))}
        <div className="sidebar-footer">
          <Link href="/settings" className={`nav-item${isActive(pathname, "/settings") ? " active" : ""}`}>
            Settings
          </Link>
          <div style={{ padding: "0 10px" }}>
            <div style={{ color: "var(--ink)" }}>{user.full_name}</div>
            <div>{user.email}</div>
          </div>
          <div className="row" style={{ padding: "0 10px" }}>
            {meta.strict_local_mode && <span className="pill accent" title="No office data is sent to external AI services.">Strict local</span>}
            {meta.demo_mode && <span className="pill warn">Demo mode</span>}
            <button className="btn small ghost" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn small menu-button" aria-label="Open menu" onClick={() => setOpen(true)}>Menu</button>
          <form onSubmit={onSearch} role="search">
            <input
              className="input"
              placeholder="Search projects, clients, consultants, contacts…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Global search"
            />
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}
