"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { DISCIPLINES, label } from "@/lib/format";
import type { Client, Consultant } from "@/lib/types";
import { ContactsEditor, toContactRows, type ContactRow } from "./ContactsEditor";
import { ErrorNotice, Field } from "./ui";

function describe(err: unknown): string {
  const e = err as ApiError;
  const detail = e.fields?.length ? ` ${e.fields.map((f) => `${label(f.field)}: ${f.message}`).join("; ")}` : "";
  return e.message + detail;
}

const blank = (v: string) => (v.trim() ? v.trim() : null);

export function ClientForm({ client, onSaved }: { client?: Client; onSaved?: (c: Client) => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: client?.name ?? "",
    billing_name: client?.billing_name ?? "",
    billing_address: client?.billing_address ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    notes: client?.notes ?? "",
    is_active: client?.is_active ?? true,
  });
  const [contacts, setContacts] = useState<ContactRow[]>(toContactRows(client?.contacts ?? []));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await api<Client>(client ? `/api/clients/${client.id}` : "/api/clients", {
        method: client ? "PUT" : "POST",
        json: {
          name: f.name, billing_name: blank(f.billing_name), billing_address: blank(f.billing_address),
          email: blank(f.email), phone: blank(f.phone), notes: blank(f.notes), is_active: f.is_active,
          contacts: contacts.map((c) => ({ full_name: c.full_name, title: blank(c.title), email: blank(c.email), phone: blank(c.phone) })),
        },
      });
      if (onSaved) onSaved(saved);
      else router.push(`/clients/${saved.id}`);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <ErrorNotice error={error} />
      <section className="form-section">
        <h2>Client</h2>
        <div className="form-grid">
          <Field label="Name"><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Billing name"><input className="input" value={f.billing_name} onChange={(e) => setF({ ...f, billing_name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Billing address" wide><textarea className="input" value={f.billing_address} onChange={(e) => setF({ ...f, billing_address: e.target.value })} /></Field>
          <Field label="Notes" wide><textarea className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <label className="row small"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active client</label>
        </div>
      </section>
      <section className="form-section">
        <h2>Contact persons</h2>
        <ContactsEditor rows={contacts} onChange={setContacts} />
      </section>
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : client ? "Save changes" : "Create client"}</button>
      </div>
    </form>
  );
}

export function ConsultantForm({ consultant, onSaved }: { consultant?: Consultant; onSaved?: (c: Consultant) => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    company_name: consultant?.company_name ?? "",
    discipline: consultant?.discipline ?? "structural",
    email: consultant?.email ?? "",
    phone: consultant?.phone ?? "",
    website: consultant?.website ?? "",
    address: consultant?.address ?? "",
    notes: consultant?.notes ?? "",
    is_active: consultant?.is_active ?? true,
  });
  const [contacts, setContacts] = useState<ContactRow[]>(toContactRows(consultant?.contacts ?? []));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await api<Consultant>(consultant ? `/api/consultants/${consultant.id}` : "/api/consultants", {
        method: consultant ? "PUT" : "POST",
        json: {
          company_name: f.company_name, discipline: f.discipline, email: blank(f.email), phone: blank(f.phone),
          website: blank(f.website), address: blank(f.address), notes: blank(f.notes), is_active: f.is_active,
          contacts: contacts.map((c) => ({ full_name: c.full_name, title: blank(c.title), email: blank(c.email), phone: blank(c.phone) })),
        },
      });
      if (onSaved) onSaved(saved);
      else router.push(`/consultants/${saved.id}`);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <ErrorNotice error={error} />
      <section className="form-section">
        <h2>Firm</h2>
        <div className="form-grid">
          <Field label="Company name"><input className="input" required value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></Field>
          <Field label="Discipline">
            <select className="input" value={f.discipline} onChange={(e) => setF({ ...f, discipline: e.target.value })}>
              {DISCIPLINES.map((d) => <option key={d} value={d}>{label(d)}</option>)}
            </select>
          </Field>
          <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Website"><input className="input" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
          <Field label="Address" wide><textarea className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="Notes" wide><textarea className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <label className="row small"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active</label>
        </div>
      </section>
      <section className="form-section">
        <h2>Contact persons</h2>
        <ContactsEditor rows={contacts} onChange={setContacts} />
      </section>
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : consultant ? "Save changes" : "Create consultant"}</button>
      </div>
    </form>
  );
}
