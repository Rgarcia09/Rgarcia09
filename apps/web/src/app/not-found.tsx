import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth">
      <div className="auth-card card">
        <h1>Page not found</h1>
        <p className="muted">The page you requested does not exist.</p>
        <Link className="btn" href="/">Back to AVA</Link>
      </div>
    </main>
  );
}
