"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface TokenSummary {
  id: string;
  name: string | null;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const McpTokens = () => {
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  // The plaintext of a freshly created token — shown once, then dismissed.
  const [freshToken, setFreshToken] = useState<string | null>(null);

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
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't create token");

      setFreshToken(data.token);
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
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="mb-3">
        <h3 className="font-medium text-gray-800">MCP access tokens</h3>
        <p className="text-sm text-gray-500">
          Connect PlaylistFox to an MCP client like Claude Desktop. Paste a
          token as a{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            Authorization: Bearer
          </code>{" "}
          header. Tokens act as you and can be revoked anytime.
        </p>
      </div>

      {/* Freshly created token — the one and only time it's shown */}
      {freshToken && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <p className="mb-2 text-xs font-medium text-[#CC5500]">
            Copy this now — you won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 font-mono text-xs text-gray-800 ring-1 ring-gray-200">
              {freshToken}
            </code>
            <button
              type="button"
              onClick={() => copy(freshToken)}
              className="shrink-0 rounded bg-[#CC5500] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#B04A00]"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setFreshToken(null)}
              className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Create */}
      <div className="mb-4 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Token name (optional), e.g. Claude Desktop"
          maxLength={120}
          className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#CC5500] focus:outline-hidden focus:ring-2 focus:ring-[#CC5500]"
        />
        <button
          type="button"
          onClick={createToken}
          disabled={busy}
          className="shrink-0 rounded bg-[#CC5500] px-4 py-2 text-sm text-white hover:bg-[#B04A00] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Generate
        </button>
      </div>

      {/* List */}
      {tokens.length === 0 ? (
        <p className="text-sm text-gray-400">No tokens yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-800">
                    {t.prefix}…
                  </span>
                  {t.name && (
                    <span className="truncate text-sm text-gray-500">
                      {t.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Created {formatDate(t.createdAt)}
                  {t.lastUsedAt
                    ? ` · Last used ${formatDate(t.lastUsedAt)}`
                    : " · Never used"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(t.id)}
                disabled={busy}
                className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-60"
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
