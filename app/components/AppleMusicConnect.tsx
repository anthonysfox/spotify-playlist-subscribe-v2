"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import toast from "react-hot-toast";

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
      // Pass the server's reason through. A bare "Failed to save Apple Music
      // token" says nothing, and the actual cause (a user row that didn't exist
      // yet) was invisible from the browser.
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
    if (!scriptReady || !status?.needsRefresh || refreshAttempted.current) return;

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

      // Opens Apple's sign-in prompt and returns the Music User Token.
      const userToken = await music.authorize();

      // MusicKit can resolve without a token if the user backs out of the sheet.
      if (!userToken) throw new Error("AUTHORIZATION_CANCELLED");

      await storeUserToken(userToken);
      await loadStatus();

      toast.success("Apple Music connected");
    } catch (error: any) {
      // Apple Music tokens are only issued to active subscribers. A non-subscriber
      // gets shown a "Try now / Not right now" upsell instead, and declining it
      // surfaces here as a bare "unauthorized" — which tells the user nothing about
      // what actually went wrong or how to fix it.
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
      // Revoke on Apple's side too, not just in our database — otherwise the
      // browser stays authorised and "connect" would silently reuse it.
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

  return (
    <>
      <Script
        src={MUSICKIT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setUnavailable(true)}
      />

      <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <h3 className="font-medium text-gray-800">Apple Music</h3>
          <p className="text-sm text-gray-500">
            {status?.connected
              ? "Connected — PlaylistFox can sync your Apple Music playlists."
              : // Say it up front. Apple only issues a user token to an active
                // subscriber, and a non-subscriber otherwise discovers this via a
                // "Try now / Not right now" upsell followed by a bare
                // "unauthorized" — with no hint that a subscription is the issue.
                "Connect to sync playlists in Apple Music. Requires an active Apple Music subscription."}
          </p>
        </div>

        <button
          type="button"
          onClick={status?.connected ? disconnect : connect}
          disabled={busy || !scriptReady || !status}
          className={`px-4 py-2 text-sm rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            status?.connected
              ? "text-gray-600 border border-gray-300 hover:bg-gray-50"
              : "bg-[#CC5500] text-white hover:bg-[#B04A00]"
          }`}
        >
          {busy
            ? "Working…"
            : !scriptReady
              ? "Loading…"
              : status?.connected
                ? "Disconnect"
                : "Connect Apple Music"}
        </button>
      </div>
    </>
  );
};
