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

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-ink text-surface max-w-[85%] rounded-[14px_14px_4px_14px] px-3.5 py-2 text-[13px] leading-relaxed">
          {message.parts.map((part: any, i: number) =>
            part.type === "text" && part.text ? (
              <span key={i} className="whitespace-pre-wrap">
                {part.text}
              </span>
            ) : null,
          )}
        </div>
      </div>
    );
  }

  // Assistant — bubbleless, with a fox chip anchoring the turn (the modern
  // chat convention: bubbled user, avatar-marked assistant).
  return (
    <div className="flex gap-2.5">
      <span className="bg-surface mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1px_var(--color-line)]">
        <Image
          src="/logo.png"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 object-cover"
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {message.parts.map((part: any, i: number) => {
          if (part.type === "text") {
            if (!part.text) return null;
            return (
              <div
                key={i}
                className="prose prose-sm text-ink prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1.5 prose-a:text-brand-deep max-w-none text-[13px]"
              >
                <MemoizedMarkdown
                  content={part.text}
                  id={`${message.id}-${i}`}
                />
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
              return (
                <ConfirmCard key={part.toolCallId ?? i} proposal={proposal} />
              );
            }
            if (error) {
              return (
                <span
                  key={i}
                  className="border-warn/25 text-warn-text inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[12px]"
                >
                  <span className="bg-warn h-1.5 w-1.5 rounded-full" />
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
    Array.isArray(o)
      ? `Searched · ${o.length} result${o.length === 1 ? "" : "s"}`
      : "Searched",
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
    <span className="border-line-strong bg-surface text-ink-50 inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[12px] font-medium">
      <span
        className={`bg-brand h-1.5 w-1.5 rounded-full ${done ? "" : "animate-softpulse"}`}
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
      <div className="border-ok/25 bg-ok/5 text-ok-text self-start rounded-xl border px-3 py-2 text-[12.5px]">
        ✓ {message}
      </div>
    );
  }
  if (state === "skipped") {
    return (
      <div className="border-line text-ink-50 self-start rounded-xl border px-3 py-2 text-[12.5px]">
        Skipped — nothing changed.
      </div>
    );
  }

  return (
    <div className="border-brand/30 bg-surface w-full max-w-[300px] self-start rounded-xl border p-3">
      <div className="text-ink-35 mb-1 flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
        <span className="bg-surface flex h-4 w-4 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1px_var(--color-line)]">
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
      <div className="text-ink text-[13px] font-medium">{proposal.title}</div>
      <p className="text-ink-50 mt-0.5 text-[12px] leading-relaxed">
        {proposal.detail}
      </p>

      {state === "error" && (
        <p className="text-warn-text mt-2 text-[11.5px]">{message}</p>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={doIt}
          disabled={state === "running"}
          className="bg-brand text-surface hover:bg-brand-deep rounded-full px-3.5 py-1.5 text-[12px] font-medium disabled:opacity-50"
        >
          {state === "running" ? "Working…" : "Do it"}
        </button>
        <button
          type="button"
          onClick={() => setState("skipped")}
          disabled={state === "running"}
          className="text-ink-50 hover:text-ink-70 px-2 py-1.5 text-[12px] font-medium disabled:opacity-50"
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
      <div className="bg-ground-alt flex items-center gap-1 rounded-2xl px-3.5 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="bg-ink-25 h-1.5 w-1.5 animate-bounce rounded-full"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
