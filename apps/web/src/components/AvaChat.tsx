"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api } from "@/lib/api";
import { toBlocks } from "@/lib/messageFormat";
import type { ChatMessage, ChatResponse, Source } from "@/lib/types";
import { ErrorNotice } from "./ui";

const DEFAULT_SUGGESTIONS = [
  "What requires attention today?",
  "What deadlines are within the next 14 days?",
  "Which projects are active?",
  "Find project 25006",
];

let localSeq = 0;

function localUserMessage(content: string): ChatMessage {
  localSeq += 1;
  return { id: `local-${localSeq}`, role: "user", content, sources: [], produced_by: null, created_at: new Date().toISOString() };
}

export function AvaAnswer({ message, avaName }: { message: ChatMessage; avaName: string }) {
  return (
    <div className="msg-ava">
      <div className="who">{avaName.toUpperCase()}</div>
      {toBlocks(message.content).map((b, i) => {
        switch (b.type) {
          case "heading":
            return <div key={i} className="heading">{b.text}</div>;
          case "label":
            return <div key={i} className="labelline"><b>{b.label}:</b> {b.value}</div>;
          case "bullet":
            return <div key={i} className="bullet">{b.text}</div>;
          case "spacer":
            return <div key={i} className="spacer" />;
          default:
            return <div key={i}>{b.text}</div>;
        }
      })}
      <Sources sources={message.sources} producedBy={message.produced_by} />
    </div>
  );
}

function Sources({ sources, producedBy }: { sources: Source[]; producedBy: string | null }) {
  if (!sources.length && producedBy === "structured") return null;
  return (
    <div className="sources">
      {sources.length > 0 && <span>Sources:</span>}
      {sources.map((s, i) =>
        s.url && s.url.startsWith("/") ? (
          <Link key={i} href={s.url} className="source">{s.label}</Link>
        ) : (
          <span key={i} className="source">{s.label}</span>
        ),
      )}
      {producedBy && producedBy !== "structured" && producedBy !== "unavailable" && (
        <span title="Answer phrased by the local AI engine from the sources shown.">· {producedBy}</span>
      )}
    </div>
  );
}

export function AvaChat({
  avaName,
  projectId,
  embedded = false,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder,
}: {
  avaName: string;
  projectId?: string;
  embedded?: boolean;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    const local = localUserMessage(message);
    setMessages((m) => [...m, local]);
    try {
      const res = await api<ChatResponse>("/api/ava/chat", {
        json: { message, conversation_id: conversationId, project_id: projectId ?? null },
      });
      setConversationId(res.conversation_id);
      setMessages((m) => [...m, res.message]);
    } catch (e) {
      setError((e as Error).message);
      setInput(message);
      setMessages((m) => m.filter((x) => x.id !== local.id));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <div className={`ava${embedded ? " embedded" : ""}`}>
      {messages.length === 0 && !embedded && (
        <div className="ava-intro">
          <h1>{avaName}</h1>
          <p className="muted">
            Ask about a project, deadline, consultant or client. Answers come from office records and cite their sources.
          </p>
        </div>
      )}
      {messages.length === 0 && (
        <div className="suggestions">
          {suggestions.map((s) => (
            <button key={s} className="suggestion" onClick={() => void send(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="thread" aria-live="polite">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="msg-user">{m.content}</div>
          ) : (
            <AvaAnswer key={m.id} message={m} avaName={avaName} />
          ),
        )}
        {busy && <div className="thinking">{avaName} is checking office records…</div>}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <ErrorNotice error={error} />
        <form onSubmit={onSubmit}>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            maxLength={4000}
            placeholder={placeholder ?? `Ask ${avaName} about a project, document, invoice, email, deadline, or report…`}
            aria-label={`Message ${avaName}`}
          />
          <button className="btn primary" type="submit" disabled={busy || !input.trim()}>
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
