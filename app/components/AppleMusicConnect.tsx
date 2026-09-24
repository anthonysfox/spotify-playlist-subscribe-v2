"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import toast from "react-hot-toast";
import { formatRelativeTime } from "utils/formatRelativeTime";

const MUSICKIT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

/**
 * MusicKit ships no types, so declare only what's actually used rather than
 * reaching for `any` and losing the compiler again.
 */
interface MusicKitInstance {
  isAuthorized: boolean;
  authorize(): Promise<string>;
  unauthorize(): Promise<void>;
}

interface MusicKitGlobal {
  configure(config: {
    developerToken: string;
    app: { name: string; build: string };
  }): Promise<MusicKitInstance>;
  getInstance(): MusicKitInstance;
}

declare global {
  interface Window {
    MusicKit?: MusicKitGlobal;
  }
}

interface TokenStatus {
  developerToken: string;
  connected: boolean;
  issuedAt: string | null;
  needsRefresh: boolean;
}

export const AppleMusicConnect = () => {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  // A refresh must happen at most once per mount, even though the effect below
  // re-runs whenever status or scriptReady changes.
  const refreshAttempted = useRef(false);

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/apple-music/token");

    if (response.status === 503) {
      // APPLE_MUSIC_* env vars aren't configured — hide the feature rather than
      // offering a button that cannot work.
      setUnavailable(true);
      return null;
    }

    if (!response.ok) return null;

    const data: TokenStatus = await response.json();
    setStatus(data);

    return data;
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  /** Configure MusicKit and return the instance. */
  const getMusicKit = useCallback(
    async (developerToken: string): Promise<MusicKitInstance> => {
      if (!window.MusicKit) {
        throw new Error("MusicKit failed to load");
      }

      return window.MusicKit.configure({
        developerToken,
        app: { name: "PlaylistFox", build: "1.0.0" },
      });
    },
    [],
  );

  /** Send a freshly minted Music User Token to the server. */
  const storeUserToken = useCallback(async (musicUserToken: string) => {
    const response = await fetch("/api/apple-music/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musicUserToken }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);

      throw new Error(
        body?.details || body?.error || "Failed to save Apple Music token",
      );
    }
  }, []);

  /**
   * Quietly replace a token that's nearing its six-month expiry.
   *
   * This is the whole reason `issuedAt` is stored. A user who opens the app even
   * once every few months never experiences a broken sync — the token is swapped
   * out here, in the background, long before anything depends on it. Failure is
   * deliberately silent: the old token still works, and there's nothing useful to
   * say to someone who didn't ask for anything.
   */
  useEffect(() => {
    if (!scriptReady || !status?.needsRefresh || refreshAttempted.current)
      return;

    refreshAttempted.current = true;

    (async () => {
      try {
        const music = await getMusicKit(status.developerToken);
        await storeUserToken(await music.authorize());
        await loadStatus();
      } catch {
        // Old token is still valid for now; the user can reconnect manually.
      }
    })();
  }, [scriptReady, status, getMusicKit, storeUserToken, loadStatus]);

  const connect = async () => {
    if (!status) return;

    setBusy(true);

    try {
      const music = await getMusicKit(status.developerToken);

      const userToken = await music.authorize();
      if (!userToken) throw new Error("AUTHORIZATION_CANCELLED");

      await storeUserToken(userToken);
      await loadStatus();

      toast.success("Apple Music connected");
    } catch (error: any) {
      const raw = String(error?.message ?? error ?? "");
      const cancelled = /cancel|unauthorized|denied/i.test(raw);

      toast.error(
        cancelled
          ? "Apple Music needs an active subscription to connect."
          : raw || "Could not connect Apple Music",
      );
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!status) return;

    setBusy(true);

    try {
      try {
        const music = await getMusicKit(status.developerToken);
        if (music.isAuthorized) await music.unauthorize();
      } catch {
        // If MusicKit won't load we can still clear our own record.
      }

      await fetch("/api/apple-music/token", { method: "DELETE" });
      await loadStatus();

      toast.success("Apple Music disconnected");
    } catch {
      toast.error("Could not disconnect Apple Music");
    } finally {
      setBusy(false);
    }
  };

  if (unavailable) return null;

  const connected = Boolean(status?.connected);
  const needsRefresh = Boolean(status?.needsRefresh);
  const since = status?.issuedAt ? formatRelativeTime(status.issuedAt) : null;

  return (
    <>
      <Script
        src={MUSICKIT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setUnavailable(true)}
      />

      <div className="border-line bg-surface rounded-2xl border p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="bg-apple h-1.5 w-1.5 shrink-0 rounded-full" />
              <span className="font-display text-ink text-[15px] font-semibold">
                Apple Music
              </span>
              <span
                className={`text-[11.5px] font-medium ${
                  needsRefresh
                    ? "text-warn-text"
                    : connected
                      ? "text-ok-text"
                      : "text-ink-50"
                }`}
              >
                {needsRefresh
                  ? "Reconnect needed"
                  : connected
                    ? "Connected"
                    : "Not connected"}
              </span>
            </div>
            <p className="text-ink-50 mt-1 max-w-[52ch] text-[12.5px] leading-relaxed">
              {connected
                ? `Lets PlaylistFox read and update your Apple Music playlists.${
                    since ? ` Connected ${since}.` : ""
                  }`
                : "Connect to sync playlists in Apple Music. Needs an active Apple Music subscription."}
            </p>
          </div>

          <button
            type="button"
            onClick={connected && !needsRefresh ? disconnect : connect}
            disabled={busy || !scriptReady || !status}
            className={`shrink-0 rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              connected && !needsRefresh
                ? "border-line-strong text-ink-70 hover:border-brand/40 hover:text-brand border"
                : "bg-brand text-surface hover:bg-brand-deep"
            }`}
          >
            {busy
              ? "Working…"
              : !scriptReady
                ? "Loading…"
                : needsRefresh
                  ? "Reconnect"
                  : connected
                    ? "Disconnect"
                    : "Connect"}
          </button>
        </div>
      </div>
    </>
  );
};
