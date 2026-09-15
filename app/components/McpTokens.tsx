"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface TokenSummary {
  id: string;
  name: string | null;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

const EXPIRY_OPTIONS = [30, 60, 90] as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// `expiresAt: null` only happens on tokens created before expiry was
// mandatory — everything generated from this form always has one.
function expiryLabel(expiresAt: string | null): { text: string; warn: boolean } {
  if (!expiresAt) return { text: "Never expires", warn: false };
  const daysLeft = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
  if (daysLeft <= 0) return { text: "Expired", warn: true };
  if (daysLeft === 1) return { text: "Expires tomorrow", warn: true };
  return { text: `Expires in ${daysLeft} days`, warn: daysLeft <= 7 };
}

export const McpTokens = () => {
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] =
    useState<(typeof EXPIRY_OPTIONS)[number]>(30);
  const [busy, setBusy] = useState(false);
  // The plaintext of a freshly created token — shown once, then dismissed.
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [freshTokenExpiresAt, setFreshTokenExpiresAt] = useState<
    string | null
  >(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/users/me/mcp-tokens");
    if (res.ok) {
      const data = await res.json();
      setTokens(data.tokens ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createToken = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/users/me/mcp-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't create token");

      setFreshToken(data.token);
      setFreshTokenExpiresAt(data.expiresAt ?? null);
      setName("");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Couldn't create token");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/me/mcp-tokens/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Couldn't revoke token");
      toast.success("Token revoked");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Couldn't revoke token");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3">
        <h3 className="font-display text-[15px] font-semibold text-ink">
          MCP access tokens
        </h3>
        <p className="mt-1 max-w-[60ch] text-[12.5px] leading-relaxed text-ink-50">
          Connect PlaylistFox to an MCP client like Claude Desktop. Paste a token
          as an{" "}
          <code className="rounded bg-ground-alt px-1 py-0.5 font-mono text-[11px]">
            Authorization: Bearer
          </code>{" "}
          header. Tokens act as you, expire automatically, and can be revoked
          anytime.
        </p>
      </div>

      {/* Freshly created token — the one and only time it's shown */}
      {freshToken && (
        <div className="mb-4 rounded-xl border border-brand/25 bg-brand-tint p-3">
          <p className="mb-2 text-[11.5px] font-medium text-brand-deep">
            Copy this now — you won&apos;t be able to see it again.{" "}
            {expiryLabel(freshTokenExpiresAt).text}.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-surface px-2 py-1.5 font-mono text-[11px] text-ink ring-1 ring-line-strong">
              {freshToken}
            </code>
            <button
              type="button"
              onClick={() => copy(freshToken)}
              className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-[11.5px] font-medium text-surface hover:bg-brand-deep"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                setFreshToken(null);
                setFreshTokenExpiresAt(null);
              }}
              className="shrink-0 rounded-full border border-line-strong px-3 py-1.5 text-[11.5px] text-ink-70 hover:border-line"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Create */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Token name (optional), e.g. Claude Desktop"
          maxLength={120}
          className="min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[13px] text-ink placeholder:text-ink-50 focus:border-brand/40 focus:outline-none"
        />
        <select
          value={expiresInDays}
          onChange={(e) =>
            setExpiresInDays(
              Number(e.target.value) as (typeof EXPIRY_OPTIONS)[number],
            )
          }
          aria-label="Token expiration"
          className="shrink-0 rounded-full border border-line-strong bg-surface px-3 py-2 text-[12.5px] text-ink-70 focus:border-brand/40 focus:outline-none"
        >
          {EXPIRY_OPTIONS.map((days) => (
            <option key={days} value={days}>
              Expires in {days} days
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={createToken}
          disabled={busy}
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-[12.5px] font-medium text-surface hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate
        </button>
      </div>

      {/* List */}
      {tokens.length === 0 ? (
        <p className="text-[12.5px] text-ink-35">No tokens yet.</p>
      ) : (
        <ul className="flex flex-col">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] text-ink">
                    {t.prefix}…
                  </span>
                  {t.name && (
                    <span className="truncate text-[12.5px] text-ink-50">
                      {t.name}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-35">
                  Created {formatDate(t.createdAt)}
                  {t.lastUsedAt
                    ? ` · Last used ${formatDate(t.lastUsedAt)}`
                    : " · Never used"}
                  {" · "}
                  <span
                    className={
                      expiryLabel(t.expiresAt).warn
                        ? "font-medium text-warn-text"
                        : undefined
                    }
                  >
                    {expiryLabel(t.expiresAt).text}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(t.id)}
                disabled={busy}
                className="shrink-0 rounded-full border border-line-strong px-3 py-1.5 text-[11.5px] font-medium text-ink-70 transition-colors hover:border-warn/40 hover:text-warn-text disabled:opacity-50"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
