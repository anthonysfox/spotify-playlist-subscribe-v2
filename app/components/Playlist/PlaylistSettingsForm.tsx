"use client";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { useUserStore } from "store/useUserStore";
import { PROVIDER_LABELS } from "store/useMusicStore";
import type { ManagedPlaylistWithSubscriptions } from "@/types";

/**
 * Playlist settings for an existing managed playlist (README "Playlist
 * settings", artboard 7a — the Settings tab of the `/library/[id]` detail
 * route). Sectioned form with a sticky diff footer. The subscribe *flow* has
 * its own drawer (SubscribeSheet); this surface is only ever edit-with-diff.
 */

type Section = "schedule" | "pulls" | "filters" | "vibe" | "cover" | "stop";

const FREQ = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom days" },
] as const;

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
] as const;

const AGE = [
  { value: 0, label: "Any age" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "3 months" },
  { value: 180, label: "6 months" },
];

const SECTIONS: { id: Section; label: string }[] = [
  { id: "schedule", label: "Schedule" },
  { id: "pulls", label: "What it pulls" },
  { id: "filters", label: "Filters" },
  { id: "vibe", label: "Vibe" },
  { id: "cover", label: "Cover art" },
];

type Form = {
  syncInterval: string;
  customDays: string[];
  syncQuantityPerSource: number;
  syncMode: "APPEND" | "REPLACE";
  explicitContentFilter: boolean;
  trackAgeLimit: number;
  vibePrompt: string;
};

function parseDays(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string" && v) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : ["monday"];
    } catch {
      return ["monday"];
    }
  }
  return ["monday"];
}

const freqLabel = (v: string) => FREQ.find((f) => f.value === v)?.label ?? v;

const snapshot = (p: ManagedPlaylistWithSubscriptions): Form => ({
  syncInterval: p.syncInterval ?? "WEEKLY",
  customDays: parseDays(p.customDays),
  syncQuantityPerSource: p.syncQuantityPerSource || 5,
  syncMode: (p.syncMode as "APPEND" | "REPLACE") || "APPEND",
  explicitContentFilter: !!p.explicitContentFilter,
  trackAgeLimit: p.trackAgeLimit || 0,
  vibePrompt: p.vibePrompt ?? "",
});

export function PlaylistSettingsForm({
  playlist,
  onStopped,
}: {
  playlist: ManagedPlaylistWithSubscriptions;
  /** Called after "Stop managing" completes — the page navigates away. */
  onStopped: () => void;
}) {
  const { user } = useUser();
  const updateManagedPlaylist = useUserStore((s) => s.updateManagedPlaylist);
  const managedPlaylists = useUserStore((s) => s.managedPlaylists);
  const setManagedPlaylists = useUserStore((s) => s.setManagedPlaylists);

  const sourceCount = playlist.subscriptions.length;
  const isApple = playlist.provider === "APPLE_MUSIC";

  const [baseline, setBaseline] = useState<Form>(() => snapshot(playlist));
  const [form, setForm] = useState<Form>(() => snapshot(playlist));
  const [section, setSection] = useState<Section>("schedule");
  const [saving, setSaving] = useState(false);
  const [stopping, setStopping] = useState(false);

  const isAdmin =
    Boolean(user?.id) && user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const canGenerateCover = isAdmin && !isApple && Boolean(playlist.id);
  const [coverUrl, setCoverUrl] = useState<string | null>(
    playlist.imageUrl ?? null,
  );
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverPayload, setCoverPayload] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState<
    "idle" | "generating" | "applying"
  >("idle");

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const changes = useMemo(() => {
    const c: string[] = [];
    if (form.syncInterval !== baseline.syncInterval) {
      c.push(
        `${freqLabel(baseline.syncInterval)} → ${freqLabel(form.syncInterval)}`,
      );
    } else if (
      form.syncInterval === "CUSTOM" &&
      form.customDays.slice().sort().join() !==
        baseline.customDays.slice().sort().join()
    ) {
      c.push("Custom days changed");
    }
    if (form.syncQuantityPerSource !== baseline.syncQuantityPerSource) {
      c.push(
        `${baseline.syncQuantityPerSource} → ${form.syncQuantityPerSource} tracks per source`,
      );
    }
    if (form.syncMode !== baseline.syncMode) {
      c.push(
        `${baseline.syncMode === "APPEND" ? "Add new songs" : "Replace all"} → ${
          form.syncMode === "APPEND" ? "Add new songs" : "Replace all"
        }`,
      );
    }
    if (form.explicitContentFilter !== baseline.explicitContentFilter) {
      c.push(
        form.explicitContentFilter
          ? "Explicit filter on"
          : "Explicit filter off",
      );
    }
    if (form.trackAgeLimit !== baseline.trackAgeLimit) {
      c.push(
        `Age limit → ${AGE.find((a) => a.value === form.trackAgeLimit)?.label}`,
      );
    }
    const v0 = baseline.vibePrompt.trim();
    const v1 = form.vibePrompt.trim();
    if (v0 !== v1) {
      c.push(!v1 ? "Vibe cleared" : !v0 ? "Vibe added" : "Vibe edited");
    }
    return c;
  }, [form, baseline]);

  const dirty = changes.length > 0;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/users/me/managed-playlists/${playlist.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            syncInterval: form.syncInterval,
            syncQuantityPerSource: form.syncQuantityPerSource,
            syncMode: form.syncMode,
            explicitContentFilter: form.explicitContentFilter,
            trackAgeLimit: form.trackAgeLimit,
            vibePrompt: form.vibePrompt,
            customDays: form.customDays,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Failed to save");
      }
      updateManagedPlaylist(playlist.id, json.data.managedPlaylist);
      setBaseline({ ...form });
      toast.success("Settings saved — takes effect from the next run.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleStopManaging = async () => {
    if (stopping) return;
    setStopping(true);
    try {
      for (const sub of playlist.subscriptions) {
        // eslint-disable-next-line no-await-in-loop
        await fetch(
          `/api/users/me/managed-playlists/${playlist.id}/subscriptions/${sub.sourcePlaylist.id}`,
          { method: "DELETE" },
        );
      }
      setManagedPlaylists(managedPlaylists.filter((p) => p.id !== playlist.id));
      toast.success(`Stopped managing ${playlist.name}.`);
      onStopped();
    } catch {
      toast.error("Couldn't stop managing this playlist");
    } finally {
      setStopping(false);
    }
  };

  const generateCover = async () => {
    setCoverBusy("generating");
    try {
      const resp = await fetch(
        `/api/music/playlists/${playlist.id}/cover-art`,
        { method: "POST" },
      );
      const data = await resp.json();
      if (!resp.ok)
        throw new Error(data?.error || "Couldn't generate cover art");
      setCoverPreview(data.image);
      setCoverPayload(data.jpegBase64);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't generate cover art");
    } finally {
      setCoverBusy("idle");
    }
  };

  const applyCover = async () => {
    if (!coverPayload) return;
    setCoverBusy("applying");
    try {
      const resp = await fetch(
        `/api/music/playlists/${playlist.id}/cover-art`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jpegBase64: coverPayload }),
        },
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Couldn't apply cover art");
      setCoverUrl(coverPreview);
      updateManagedPlaylist(playlist.id, { imageUrl: coverPreview });
      setCoverPreview(null);
      setCoverPayload(null);
      toast.success("Cover art updated — Spotify may take a moment.");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't apply cover art");
    } finally {
      setCoverBusy("idle");
    }
  };

  const scopeLine = `Applies to all ${sourceCount} source${
    sourceCount === 1 ? "" : "s"
  } feeding this playlist.`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex min-h-0 flex-1 flex-col min-[720px]:flex-row">
        {/* Section nav — horizontal strip on mobile, sidebar on desktop */}
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2 min-[720px]:w-[176px] min-[720px]:flex-col min-[720px]:gap-0.5 min-[720px]:border-b-0 min-[720px]:border-r min-[720px]:p-3">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`whitespace-nowrap rounded-[9px] px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                section === s.id
                  ? "bg-brand-tint text-brand-deep"
                  : "text-ink-70 hover:bg-ground-alt"
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSection("stop")}
            className={`whitespace-nowrap rounded-[9px] px-3 py-2 text-left text-[13px] font-medium transition-colors min-[720px]:mt-auto ${
              section === "stop"
                ? "bg-warn/10 text-warn-text"
                : "text-warn-text hover:bg-warn/10"
            }`}
          >
            Stop managing
          </button>
        </div>

        {/* Section body */}
        <div className="min-w-0 flex-1 overflow-y-auto p-4 min-[720px]:p-6">
          {section === "schedule" && (
            <div>
              <h3 className="font-display text-[15px] font-semibold text-ink">
                Schedule
              </h3>
              <p className="mb-3 mt-0.5 text-[12.5px] text-ink-50">
                {scopeLine}
              </p>
              <div className="mb-3 flex rounded-[10px] bg-ground-chip p-[3px]">
                {FREQ.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => set("syncInterval", f.value)}
                    className={`flex-1 rounded-lg py-2 text-[13px] transition-colors ${
                      form.syncInterval === f.value
                        ? "bg-ink font-medium text-surface"
                        : "text-ink-70 hover:text-ink"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {form.syncInterval === "CUSTOM" && (
                <>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {DAYS.map(([value, label]) => {
                      const on = form.customDays.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            set(
                              "customDays",
                              on
                                ? form.customDays.filter((d) => d !== value)
                                : [...form.customDays, value],
                            )
                          }
                          className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                            on
                              ? "bg-brand text-surface"
                              : "border border-line-strong bg-surface text-ink-70"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11.5px] text-ink-35">
                    Runs at 6am in your timezone.
                  </p>
                </>
              )}
            </div>
          )}

          {section === "pulls" && (
            <div>
              <h3 className="mb-3 font-display text-[15px] font-semibold text-ink">
                What each run pulls
              </h3>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">
                  Tracks per source
                </span>
                <span className="font-mono text-[12.5px] text-brand">
                  {form.syncQuantityPerSource}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={form.syncQuantityPerSource}
                onChange={(e) =>
                  set("syncQuantityPerSource", Number(e.target.value))
                }
                className="w-full accent-brand"
              />
              <p className="mt-2 text-[11.5px] text-ink-35">
                Up to {sourceCount * form.syncQuantityPerSource} candidates per
                run across {sourceCount} source
                {sourceCount === 1 ? "" : "s"}, before filters.
              </p>

              <div className="mt-5 border-t border-line pt-4">
                <div className="mb-2 text-[13px] font-medium text-ink">
                  Each run
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => set("syncMode", "APPEND")}
                    className={`rounded-[11px] border px-3 py-2.5 text-left transition-colors ${
                      form.syncMode === "APPEND"
                        ? "border-brand bg-brand-tint-soft"
                        : "border-line"
                    }`}
                  >
                    <div className="text-[13px] font-medium text-ink">
                      Add new songs
                    </div>
                    <div className="text-[11.5px] text-ink-50">
                      Keep existing, append new
                    </div>
                  </button>
                  {!isApple && (
                    <button
                      type="button"
                      onClick={() => set("syncMode", "REPLACE")}
                      className={`rounded-[11px] border px-3 py-2.5 text-left transition-colors ${
                        form.syncMode === "REPLACE"
                          ? "border-brand bg-brand-tint-soft"
                          : "border-line"
                      }`}
                    >
                      <div className="text-[13px] font-medium text-ink">
                        Replace all songs
                      </div>
                      <div className="text-[11.5px] text-ink-50">
                        Clear and refill, rotating deeper
                      </div>
                    </button>
                  )}
                </div>
                {isApple && (
                  <p className="mt-2 text-[11.5px] text-ink-35">
                    Replace isn&apos;t available on Apple Music — its API
                    can&apos;t remove tracks from a playlist.
                  </p>
                )}
              </div>
            </div>
          )}

          {section === "filters" && (
            <div>
              <h3 className="font-display text-[15px] font-semibold text-ink">
                Filters
              </h3>
              <p className="mb-3 mt-0.5 text-[12.5px] text-ink-50">
                {scopeLine}
              </p>
              <label className="flex items-center justify-between border-b border-line py-3">
                <span className="text-[13px] text-ink">
                  Filter explicit tracks
                </span>
                <input
                  type="checkbox"
                  checked={form.explicitContentFilter}
                  onChange={(e) =>
                    set("explicitContentFilter", e.target.checked)
                  }
                  className="h-4 w-4 accent-brand"
                />
              </label>
              <div className="pt-3">
                <div className="mb-2 text-[13px] text-ink">
                  Skip tracks older than
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AGE.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => set("trackAgeLimit", a.value)}
                      className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                        form.trackAgeLimit === a.value
                          ? "bg-brand-tint text-brand-deep"
                          : "border border-line-strong bg-surface text-ink-70"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === "vibe" && (
            <div>
              <h3 className="font-display text-[15px] font-semibold text-ink">
                Vibe{" "}
                <span className="text-[11px] font-normal text-ink-35">
                  optional
                </span>
              </h3>
              <p className="mb-2 mt-0.5 text-[12.5px] text-ink-50">
                Describe what belongs on this playlist.
              </p>
              <textarea
                rows={4}
                maxLength={300}
                value={form.vibePrompt}
                onChange={(e) => set("vibePrompt", e.target.value)}
                placeholder="e.g. upbeat indie and synth-pop, nothing slow or sad"
                className="w-full resize-none rounded-lg border border-line-strong bg-surface p-3 text-[13px] text-ink placeholder:text-ink-50 focus:border-brand/40 focus:outline-none"
              />
              <div className="mt-1 flex justify-between text-[11.5px] text-ink-35">
                <span>
                  {form.vibePrompt.trim()
                    ? "The fox reads the candidates and picks the ones that fit."
                    : "Leave blank to take whatever comes first from each source."}
                </span>
                <span>{form.vibePrompt.length}/300</span>
              </div>
            </div>
          )}

          {section === "cover" && (
            <div>
              <h3 className="font-display text-[15px] font-semibold text-ink">
                Cover art
              </h3>
              {!canGenerateCover ? (
                <p className="mt-2 text-[12.5px] text-ink-50">
                  {isApple
                    ? "Cover art generation is Spotify-only."
                    : "Cover art generation isn't available for this account."}
                </p>
              ) : (
                <>
                  <p className="mb-3 mt-0.5 text-[12.5px] text-ink-50">
                    Generate artwork from this playlist&apos;s vibe and tracks,
                    then set it as the Spotify cover. Nothing changes on Spotify
                    until you apply it.
                  </p>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt="Current cover"
                          className="h-[104px] w-[104px] rounded-xl object-cover opacity-70"
                        />
                      ) : (
                        <span className="art-placeholder h-[104px] w-[104px] rounded-xl" />
                      )}
                      <span className="text-[10.5px] text-ink-35">Current</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {coverPreview ? (
                        <img
                          src={coverPreview}
                          alt="Generated cover"
                          className="h-[104px] w-[104px] rounded-xl object-cover outline outline-2 outline-brand"
                        />
                      ) : (
                        <span className="flex h-[104px] w-[104px] items-center justify-center rounded-xl border border-dashed border-line-strong text-[10.5px] text-ink-35">
                          none yet
                        </span>
                      )}
                      <span className="text-[10.5px] text-ink-35">
                        Generated
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={generateCover}
                      disabled={coverBusy !== "idle"}
                      className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] font-medium text-ink-70 disabled:opacity-50"
                    >
                      {coverBusy === "generating"
                        ? "Generating…"
                        : coverPreview
                          ? "Regenerate"
                          : "Generate cover art"}
                    </button>
                    {coverPreview && (
                      <button
                        type="button"
                        onClick={applyCover}
                        disabled={coverBusy !== "idle"}
                        className="rounded-full bg-brand px-4 py-2 text-[12.5px] font-medium text-surface disabled:opacity-50"
                      >
                        {coverBusy === "applying"
                          ? "Applying…"
                          : "Use this cover"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {section === "stop" && (
            <div>
              <h3 className="font-display text-[15px] font-semibold text-warn-text">
                Stop managing this playlist
              </h3>
              <p className="mt-2 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-70">
                This removes all {sourceCount} source
                {sourceCount === 1 ? "" : "s"} and stops syncing.{" "}
                <b className="font-semibold">{playlist.name}</b> and its tracks
                stay in your {PROVIDER_LABELS[playlist.provider]} account.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleStopManaging}
                  disabled={stopping}
                  className="rounded-full bg-warn px-4 py-2 text-[13px] font-medium text-surface disabled:opacity-50"
                >
                  {stopping ? "Stopping…" : "Stop managing"}
                </button>
                <button
                  type="button"
                  onClick={() => setSection("schedule")}
                  className="rounded-full px-4 py-2 text-[13px] font-medium text-ink-50 hover:text-ink-70"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diff footer — summary stacks above the buttons on mobile */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line px-4 py-3 min-[720px]:flex-nowrap min-[720px]:px-6 min-[720px]:py-3.5">
        <div className="flex basis-full items-center gap-2 min-[720px]:basis-auto min-[720px]:flex-1">
          <span
            className={`h-[7px] w-[7px] shrink-0 rounded-full ${
              dirty ? "bg-brand" : "bg-ink-25"
            }`}
          />
          <span className="text-[12.5px] leading-snug text-ink-70">
            {dirty ? (
              <>
                <b className="font-semibold">
                  {changes.length} change{changes.length === 1 ? "" : "s"}
                </b>{" "}
                — {changes.slice(0, 3).join(", ")}
                {changes.length > 3 ? "…" : ""}. Takes effect from the next run.
              </>
            ) : (
              "No changes yet."
            )}
          </span>
        </div>
        {dirty && (
          <button
            type="button"
            onClick={() => setForm({ ...baseline })}
            className="px-2 py-2 text-[13px] text-ink-50 hover:text-ink-70"
          >
            Revert
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="rounded-full bg-brand px-6 py-2.5 text-[13.5px] font-medium text-surface transition-colors hover:bg-brand-deep disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
