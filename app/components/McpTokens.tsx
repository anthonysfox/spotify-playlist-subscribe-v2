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
function expiryLabel(expiresAt: string | null): {
  text: string;
  warn: boolean;
} {
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
  const [freshTokenExpiresAt, setFreshTokenExpiresAt] = useState<string | null>(
    null,
  );

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
    <div className="border-line bg-surface rounded-2xl border p-4">
      <div className="mb-3">
        <h3 className="font-display text-ink text-[15px] font-semibold">
          MCP access tokens
        </h3>
        <p className="text-ink-50 mt-1 max-w-[60ch] text-[12.5px] leading-relaxed">
          Connect PlaylistFox to an MCP client like Claude Desktop. Paste a
          token as an{" "}
          <code className="bg-ground-alt rounded px-1 py-0.5 font-mono text-[11px]">
            Authorization: Bearer
          </code>{" "}
          header. Tokens act as you, expire automatically, and can be revoked
          anytime.
        </p>
      </div>

      {/* Freshly created token — the one and only time it's shown */}
      {freshToken && (
        <div className="border-brand/25 bg-brand-tint mb-4 rounded-xl border p-3">
          <p className="text-brand-deep mb-2 text-[11.5px] font-medium">
            Copy this now — you won&apos;t be able to see it again.{" "}
            {expiryLabel(freshTokenExpiresAt).text}.
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-surface text-ink ring-line-strong min-w-0 flex-1 truncate rounded-md px-2 py-1.5 font-mono text-[11px] ring-1">
              {freshToken}
            </code>
            <button
              type="button"
              onClick={() => copy(freshToken)}
              className="bg-brand text-surface hover:bg-brand-deep shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                setFreshToken(null);
                setFreshTokenExpiresAt(null);
              }}
              className="border-line-strong text-ink-70 hover:border-line shrink-0 rounded-full border px-3 py-1.5 text-[11.5px]"
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
          className="border-line-strong bg-surface text-ink placeholder:text-ink-50 focus:border-brand/40 min-w-0 flex-1 rounded-full border px-3.5 py-2 text-[13px] focus:outline-none"
        />
        <select
          value={expiresInDays}
          onChange={(e) =>
            setExpiresInDays(
              Number(e.target.value) as (typeof EXPIRY_OPTIONS)[number],
            )
          }
          aria-label="Token expiration"
          className="border-line-strong bg-surface text-ink-70 focus:border-brand/40 shrink-0 rounded-full border px-3 py-2 text-[12.5px] focus:outline-none"
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
          className="bg-brand text-surface hover:bg-brand-deep shrink-0 rounded-full px-4 py-2 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate
        </button>
      </div>

      {/* List */}
      {tokens.length === 0 ? (
        <p className="text-ink-35 text-[12.5px]">No tokens yet.</p>
      ) : (
        <ul className="flex flex-col">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="border-line flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-ink font-mono text-[12.5px]">
                    {t.prefix}…
                  </span>
                  {t.name && (
                    <span className="text-ink-50 truncate text-[12.5px]">
                      {t.name}
                    </span>
                  )}
                </div>
                <p className="text-ink-35 text-[11px]">
                  Created {formatDate(t.createdAt)}
                  {t.lastUsedAt
                    ? ` · Last used ${formatDate(t.lastUsedAt)}`
                    : " · Never used"}
                  {" · "}
                  <span
                    className={
                      expiryLabel(t.expiresAt).warn
                        ? "text-warn-text font-medium"
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
                className="border-line-strong text-ink-70 hover:border-warn/40 hover:text-warn-text shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors disabled:opacity-50"
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
