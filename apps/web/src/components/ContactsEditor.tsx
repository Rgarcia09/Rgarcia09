"use client";

import { Field } from "./ui";

export interface ContactRow {
  full_name: string;
  title: string;
  email: string;
  phone: string;
}

export function ContactsEditor({ rows, onChange }: { rows: ContactRow[]; onChange: (rows: ContactRow[]) => void }) {
  const update = (i: number, patch: Partial<ContactRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <div key={i} className="form-grid" style={{ alignItems: "end" }}>
          <Field label="Name"><input className="input" required value={r.full_name} onChange={(e) => update(i, { full_name: e.target.value })} /></Field>
          <Field label="Title"><input className="input" value={r.title} onChange={(e) => update(i, { title: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={r.email} onChange={(e) => update(i, { email: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={r.phone} onChange={(e) => update(i, { phone: e.target.value })} /></Field>
          <div><button type="button" className="btn small" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button></div>
        </div>
      ))}
      <div>
        <button type="button" className="btn small" onClick={() => onChange([...rows, { full_name: "", title: "", email: "", phone: "" }])}>Add contact</button>
      </div>
    </div>
  );
}

export function toContactRows(contacts: { full_name: string; title: string | null; email: string | null; phone: string | null }[]): ContactRow[] {
  return contacts.map((c) => ({ full_name: c.full_name, title: c.title ?? "", email: c.email ?? "", phone: c.phone ?? "" }));
}
