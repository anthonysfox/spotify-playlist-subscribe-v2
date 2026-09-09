"use client";

import { useState } from "react";
import Image from "next/image";
import { MemoizedMarkdown } from "../MemoizedMarkdown";
import { PlaylistResultCards } from "./PlaylistPreviewCards";
import { useUserStore } from "store/useUserStore";
import type { AgentProposal } from "@/lib/agent/proposals";

const READ_TOOLS = new Set([
  "searchPlaylists",
  "listManagedPlaylists",
  "listManagedPlaylistDetails",
]);

export function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-[14px_14px_4px_14px] bg-ink px-3.5 py-2 text-[13px] leading-relaxed text-surface"
            : "flex max-w-[92%] flex-col gap-2"
        }
      >
        {message.parts.map((part: any, i: number) => {
          if (part.type === "text") {
            if (!part.text) return null;
            if (isUser) {
              return (
                <span key={i} className="whitespace-pre-wrap">
                  {part.text}
                </span>
              );
            }
            return (
              <div
                key={i}
                className="prose prose-sm max-w-none text-[13px] text-ink-70 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1.5 prose-a:text-brand-deep"
              >
                <MemoizedMarkdown content={part.text} id={`${message.id}-${i}`} />
              </div>
            );
          }

          if (
            part.type === "tool-searchPlaylists" &&
            part.state === "output-available" &&
            Array.isArray(part.output)
          ) {
            return <PlaylistResultCards key={i} playlists={part.output} />;
          }

          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            const name = part.type.replace("tool-", "");
            const done = part.state === "output-available";
            const proposal: AgentProposal | undefined =
              done && part.output?.proposal;
            const error: string | undefined = done && part.output?.error;

            if (proposal) {
              return <ConfirmCard key={part.toolCallId ?? i} proposal={proposal} />;
            }
            if (error) {
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 self-start rounded-full border border-warn/25 px-2.5 py-1 text-[12px] text-warn-text"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                  {error}
                </span>
              );
            }
            if (READ_TOOLS.has(name)) {
              return (
                <ToolPill
                  key={i}
                  name={name}
                  done={done}
                  output={part.output}
                />
              );
            }
            // A proposer still running.
            return <ToolPill key={i} name={name} done={false} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

const READ_LABEL: Record<string, (o: any) => string> = {
  searchPlaylists: (o) =>
    Array.isArray(o) ? `Searched · ${o.length} result${o.length === 1 ? "" : "s"}` : "Searched",
  listManagedPlaylists: () => "Read your library",
  listManagedPlaylistDetails: () => "Read a playlist's settings",
};

const RUN_LABEL: Record<string, string> = {
  searchPlaylists: "Searching",
  listManagedPlaylists: "Reading your library",
  listManagedPlaylistDetails: "Reading playlist settings",
  generatePlaylist: "Working out a tracklist",
  addArtistsToPlaylist: "Finding artist mixes",
  createSubscription: "Preparing the subscription",
  removeSource: "Checking that source",
};

function ToolPill({
  name,
  done,
  output,
}: {
  name: string;
  done: boolean;
  output?: any;
}) {
  const label = done
    ? (READ_LABEL[name]?.(output) ??
      name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase())
    : (RUN_LABEL[name] ?? "Working") + "…";

  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-line-strong bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-50">
      <span
        className={`h-1.5 w-1.5 rounded-full bg-brand ${done ? "" : "animate-softpulse"}`}
      />
      {label}
    </span>
  );
}

/**
 * A write the assistant proposed. Nothing happens until "Do it" — that POSTs
 * the proposal to /api/agent/execute, the one path that actually mutates.
 */
function ConfirmCard({ proposal }: { proposal: AgentProposal }) {
  const setManagedPlaylists = useUserStore((s) => s.setManagedPlaylists);
  const [state, setState] = useState<
    "idle" | "running" | "done" | "skipped" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  const doIt = async () => {
    setState("running");
    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        setState("error");
        setMessage(data?.message ?? "Couldn't apply that");
        return;
      }
      setState("done");
      setMessage(data.message ?? "Done");
      // Reflect library changes without a reload.
      try {
        const mp = await fetch("/api/users/me/managed-playlists");
        if (mp.ok) setManagedPlaylists(await mp.json());
      } catch {
        /* the toast/message already told the user it worked */
      }
    } catch {
      setState("error");
      setMessage("Couldn't reach the server");
    }
  };

  if (state === "done") {
    return (
      <div className="self-start rounded-xl border border-ok/25 bg-ok/5 px-3 py-2 text-[12.5px] text-ok-text">
        ✓ {message}
      </div>
    );
  }
  if (state === "skipped") {
    return (
      <div className="self-start rounded-xl border border-line px-3 py-2 text-[12.5px] text-ink-50">
        Skipped — nothing changed.
      </div>
    );
  }

  return (
    <div className="self-start w-full max-w-[300px] rounded-xl border border-brand/30 bg-surface p-3">
      <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
        <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)]">
          <Image
            src="/logo.png"
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-cover"
          />
        </span>
        Confirm before I change anything
      </div>
      <div className="text-[13px] font-medium text-ink">{proposal.title}</div>
      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-50">
        {proposal.detail}
      </p>

      {state === "error" && (
        <p className="mt-2 text-[11.5px] text-warn-text">{message}</p>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={doIt}
          disabled={state === "running"}
          className="rounded-full bg-brand px-3.5 py-1.5 text-[12px] font-medium text-surface hover:bg-brand-deep disabled:opacity-50"
        >
          {state === "running" ? "Working…" : "Do it"}
        </button>
        <button
          type="button"
          onClick={() => setState("skipped")}
          disabled={state === "running"}
          className="px-2 py-1.5 text-[12px] font-medium text-ink-50 hover:text-ink-70 disabled:opacity-50"
        >
          No
        </button>
      </div>
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-ground-alt px-3.5 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-25"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
