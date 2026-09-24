"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Check,
  Plus,
  Minus,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import toast from "react-hot-toast";
import { useUserStore } from "store/useUserStore";
import type { PlaylistSummary, MusicProvider } from "@/lib/music/types";
import type { SubscribeReqBody } from "@/types";

/**
 * The whole subscribe flow on one surface (README "Subscribe flow", artboards
 * 3b / 4a / 4b). Replaces SubscribeModal *and* the "Advanced Settings" hop into
 * SettingsModal — every field is here, ordered common → rare.
 *
 * Two widths: a right drawer by default, expandable to a two-column layout for
 * the full picker. Below 720px it's a bottom sheet. Multiple sources and/or
 * multiple destinations fan out into one `/api/music/subscribe` call per
 * (source × destination) pair — the endpoint takes one of each.
 */

const FREQUENCIES: { value: string; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

const DAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const AGE_LIMITS: { value: number; label: string }[] = [
  { value: 0, label: "Any age" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 3 months" },
  { value: 180, label: "Last 6 months" },
];

const FREQ_WORD: Record<string, string> = {
  DAILY: "day",
  WEEKLY: "week",
  MONTHLY: "month",
  CUSTOM: "scheduled day",
};

const refOf = (p: PlaylistSummary) => ({
  id: p.id,
  name: p.name,
  imageUrl: p.imageUrl ?? "",
  trackCount: p.trackCount ?? 0,
});

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[2px] transition-colors ${
        on ? "justify-end bg-brand" : "justify-start bg-ink-25"
      }`}
    >
      <span className="h-[17px] w-[17px] rounded-full bg-surface" />
    </button>
  );
}

export function SubscribeSheet({
  sources,
  onClose,
}: {
  sources: PlaylistSummary[];
  onClose: () => void;
}) {
  const provider: MusicProvider = sources[0]?.provider ?? "SPOTIFY";
  const isApple = provider === "APPLE_MUSIC";

  const userData = useUserStore((s) => s.user);
  const managedPlaylists = useUserStore((s) => s.managedPlaylists);
  const addManagedPlaylist = useUserStore((s) => s.addManagedPlaylist);

  const [expanded, setExpanded] = useState(false);

  // Destinations
  const [destPlaylists, setDestPlaylists] = useState<PlaylistSummary[]>([]);
  const [destLoading, setDestLoading] = useState(true);
  const [destFilter, setDestFilter] = useState("");
  const [selectedDestIds, setSelectedDestIds] = useState<Set<string>>(
    new Set(),
  );
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addingNew, setAddingNew] = useState(false);

  // Rules
  const [syncFrequency, setSyncFrequency] = useState("WEEKLY");
  const [customDays, setCustomDays] = useState<string[]>(["monday"]);
  const [qty, setQty] = useState(12);
  const [syncMode, setSyncMode] = useState<"APPEND" | "REPLACE">("APPEND");
  const [trackAgeLimit, setTrackAgeLimit] = useState(0);
  const [explicitFilter, setExplicitFilter] = useState(false);
  const [runImmediateSync, setRunImmediateSync] = useState(true);
  const [vibePrompt, setVibePrompt] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isApple && syncMode === "REPLACE") setSyncMode("APPEND");
  }, [isApple, syncMode]);

  useEffect(() => {
    if (!userData) return;
    let cancelled = false;
    setDestLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/music/user-playlists?provider=${provider}`,
        );
        const { playlists } = (await res.json()) as {
          playlists: PlaylistSummary[];
        };
        if (!cancelled) setDestPlaylists(playlists ?? []);
      } catch (err) {
        console.error("Failed to load destination playlists:", err);
      } finally {
        if (!cancelled) setDestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, userData]);

  const managedByExternalId = useMemo(() => {
    const m = new Map<string, (typeof managedPlaylists)[number]>();
    managedPlaylists.forEach((mp) => m.set(mp.externalPlaylistId, mp));
    return m;
  }, [managedPlaylists]);

  const filteredDest = useMemo(() => {
    const q = destFilter.trim().toLowerCase();
    if (!q) return destPlaylists;
    return destPlaylists.filter((p) => p.name.toLowerCase().includes(q));
  }, [destPlaylists, destFilter]);

  const toggleDest = (id: string) =>
    setSelectedDestIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const destCount = selectedDestIds.size + (newPlaylistName.trim() ? 1 : 0);
  const canSubmit = sources.length > 0 && destCount > 0 && !submitting;

  const selectedDestNames = useMemo(() => {
    const names = [...selectedDestIds]
      .map((id) => destPlaylists.find((p) => p.id === id)?.name)
      .filter(Boolean) as string[];
    if (newPlaylistName.trim()) names.push(newPlaylistName.trim());
    return names;
  }, [selectedDestIds, destPlaylists, newPlaylistName]);

  // Split the selection into destinations that already have rules (managed) and
  // ones that will adopt the rules below (new, or not-managed-yet → becomes
  // managed). The subscribe endpoint ignores rule fields for the former.
  const selectedManaged = useMemo(
    () =>
      [...selectedDestIds]
        .map((id) => destPlaylists.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({
          playlist: p!,
          managed: managedByExternalId.get(p!.id) ?? null,
        })),
    [selectedDestIds, destPlaylists, managedByExternalId],
  );
  const existingManaged = selectedManaged.filter((d) => d.managed);
  const adoptingRulesCount =
    selectedManaged.filter((d) => !d.managed).length +
    (newPlaylistName.trim() ? 1 : 0);
  const rulesApply = adoptingRulesCount > 0 || destCount === 0;

  const sentence = useMemo(() => {
    const srcLabel =
      sources.length === 1 ? sources[0].name : `${sources.length} sources`;

    // Every selected destination already has its own rules — describe those,
    // not the (inert) controls.
    if (!rulesApply && existingManaged.length > 0) {
      if (existingManaged.length === 1) {
        const m = existingManaged[0].managed!;
        const word = FREQ_WORD[m.syncInterval] ?? "run";
        const verb = m.syncMode === "REPLACE" ? "rotate into" : "get added to";
        return `Every ${word}, up to ${m.syncQuantityPerSource} new tracks from ${srcLabel} ${verb} ${existingManaged[0].playlist.name}, on its existing schedule.`;
      }
      return `${srcLabel} will feed ${existingManaged.length} playlists, each on its own existing schedule.`;
    }

    const word = FREQ_WORD[syncFrequency] ?? "run";
    const destLabel =
      selectedDestNames.length === 0
        ? "a new playlist"
        : selectedDestNames.length === 1
          ? selectedDestNames[0]
          : `${selectedDestNames.length} playlists`;
    const action =
      syncMode === "REPLACE"
        ? `replace the tracks in ${destLabel}`
        : `get added to ${destLabel}`;
    let s = `Every ${word}, up to ${qty} new track${
      qty === 1 ? "" : "s"
    } from ${srcLabel} ${action}.`;
    const skips: string[] = [];
    if (explicitFilter) skips.push("explicit tracks");
    if (trackAgeLimit) {
      const l = AGE_LIMITS.find((a) => a.value === trackAgeLimit)?.label;
      if (l) skips.push(`tracks older than ${l.replace(/^Last /, "")}`);
    }
    if (skips.length) {
      const joined = skips.join(" and ");
      s += ` ${joined.charAt(0).toUpperCase() + joined.slice(1)} are skipped.`;
    }
    return s;
  }, [
    rulesApply,
    existingManaged,
    syncFrequency,
    qty,
    syncMode,
    explicitFilter,
    trackAgeLimit,
    sources,
    selectedDestNames,
  ]);

  const submitLabel = submitting
    ? "Subscribing…"
    : sources.length > 1
      ? `Subscribe all ${sources.length}`
      : destCount > 1
        ? `Subscribe to ${destCount}`
        : "Subscribe";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    type Target = { kind: "existing"; dest: PlaylistSummary } | { kind: "new" };
    const targets: Target[] = [
      ...[...selectedDestIds]
        .map((id) => destPlaylists.find((p) => p.id === id))
        .filter(Boolean)
        .map((dest) => ({ kind: "existing" as const, dest: dest! })),
      ...(newPlaylistName.trim() ? [{ kind: "new" as const }] : []),
    ];

    let createdRef: SubscribeReqBody["managedPlaylist"] | null = null;
    let ok = 0;
    let fail = 0;

    for (const source of sources) {
      for (const target of targets) {
        // A destination that is already managed keeps its own rules — only send
        // the link. New / not-yet-managed destinations adopt the rules below.
        const adoptsRules =
          target.kind === "new" || !managedByExternalId.get(target.dest.id);

        const body: SubscribeReqBody = {
          provider,
          sourcePlaylist: refOf(source),
          runImmediateSync,
          ...(adoptsRules
            ? {
                syncFrequency,
                syncQuantityPerSource: qty,
                syncMode,
                explicitContentFilter: explicitFilter,
                trackAgeLimit,
                vibePrompt: vibePrompt.trim() || undefined,
                customDays: syncFrequency === "CUSTOM" ? customDays : undefined,
              }
            : {}),
        } as SubscribeReqBody;

        if (target.kind === "new") {
          if (createdRef) body.managedPlaylist = createdRef;
          else body.newPlaylistName = newPlaylistName.trim();
        } else {
          body.managedPlaylist = refOf(target.dest);
        }

        try {
          const res = await fetch("/api/music/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (json?.success && json.data?.managedPlaylist) {
            ok++;
            addManagedPlaylist(json.data.managedPlaylist);
            if (target.kind === "new" && !createdRef) {
              const mp = json.data.managedPlaylist;
              createdRef = {
                id: mp.externalPlaylistId,
                name: mp.name,
                imageUrl: mp.imageUrl ?? "",
                trackCount: mp.trackCount ?? 0,
              };
            }
          } else {
            fail++;
          }
        } catch (err) {
          console.error("subscribe failed:", err);
          fail++;
        }
      }
    }

    setSubmitting(false);
    if (fail === 0) {
      toast.success(ok === 1 ? "Subscribed" : `Subscribed · ${ok} added`);
      onClose();
    } else {
      toast.error(`${ok} succeeded, ${fail} failed`);
    }
  };

  // ---- pieces ----

  const destinationList = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
          Add to
        </span>
        {destCount > 0 && (
          <span className="font-mono text-[11px] text-brand">
            {destCount} selected
          </span>
        )}
      </div>

      <input
        value={destFilter}
        onChange={(e) => setDestFilter(e.target.value)}
        placeholder="Filter your playlists"
        className="rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[13px] text-ink placeholder:text-ink-50 focus:border-brand/40 focus:outline-none"
      />

      <div className="flex flex-col gap-1.5">
        {destLoading && (
          <p className="py-4 text-center text-[12px] text-ink-35">
            Loading your playlists…
          </p>
        )}

        {!destLoading &&
          filteredDest.map((p) => {
            const selected = selectedDestIds.has(p.id);
            const managed = managedByExternalId.get(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleDest(p.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? "border-brand bg-brand-tint-soft"
                    : "border-line hover:border-line-strong"
                }`}
              >
                <span
                  className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md ${
                    selected ? "bg-brand text-surface" : "border border-ink-25"
                  }`}
                >
                  {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="art-placeholder h-8 w-8 shrink-0 rounded-md" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">
                    {p.name}
                  </span>
                  <span
                    className={`block truncate text-[11.5px] ${
                      managed ? "text-ink-35" : "text-brand"
                    }`}
                  >
                    {managed
                      ? `managed · ${managed.subscriptions.length} source${
                          managed.subscriptions.length === 1 ? "" : "s"
                        }`
                      : "will become managed"}
                  </span>
                </span>
              </button>
            );
          })}

        {/* New managed playlist */}
        {addingNew ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-line-strong px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand">
              <Plus className="h-4 w-4" />
            </span>
            <input
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="New playlist name"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink-50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setAddingNew(false);
                setNewPlaylistName("");
              }}
              className="text-ink-35 hover:text-ink-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            className="flex items-center gap-2.5 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand">
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-[13.5px] font-medium text-brand">
              New managed playlist
            </span>
          </button>
        )}
      </div>
    </div>
  );

  const rulesForm = (
    <div className="flex flex-col gap-5">
      {/* How often */}
      <div>
        <div className="mb-2 text-[13px] font-medium text-ink">How often</div>
        <div className="flex rounded-xl bg-ground-chip p-[3px]">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSyncFrequency(f.value)}
              className={`flex-1 rounded-[9px] py-2 text-[12.5px] transition-colors ${
                syncFrequency === f.value
                  ? "bg-ink font-medium text-surface"
                  : "text-ink-70 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {syncFrequency === "CUSTOM" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DAYS.map((d) => {
              const on = customDays.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() =>
                    setCustomDays((prev) =>
                      prev.includes(d.value)
                        ? prev.filter((x) => x !== d.value)
                        : [...prev, d.value],
                    )
                  }
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                    on
                      ? "bg-brand-tint text-brand-deep"
                      : "bg-ground-alt text-ink-50"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tracks per run + Each run */}
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[140px] flex-1">
          <div className="mb-2 text-[13px] font-medium text-ink">
            Tracks per run
          </div>
          <div className="flex items-center justify-between rounded-[10px] border border-line-strong px-3 py-2">
            <button
              type="button"
              aria-label="Fewer"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="text-ink-35 hover:text-ink-70"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-[13.5px] font-medium text-ink">{qty}</span>
            <button
              type="button"
              aria-label="More"
              onClick={() => setQty((q) => Math.min(50, q + 1))}
              className="text-ink-35 hover:text-ink-70"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-w-[160px] flex-1">
          <div className="mb-2 text-[13px] font-medium text-ink">Each run</div>
          <div className="flex gap-1.5">
            {(["APPEND", "REPLACE"] as const).map((m) => {
              const disabled = m === "REPLACE" && isApple;
              const active = syncMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSyncMode(m)}
                  title={
                    disabled
                      ? "Apple Music can't remove tracks, so replace isn't available"
                      : undefined
                  }
                  className={`flex-1 rounded-[10px] border px-2 py-2 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-brand bg-brand-tint-soft text-brand-deep"
                      : "border-line text-ink-70"
                  } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {m === "APPEND" ? "Append" : "Replace"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Skip older than */}
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] text-ink">Skip tracks older than</span>
        <select
          value={trackAgeLimit}
          onChange={(e) => setTrackAgeLimit(Number(e.target.value))}
          className="rounded-md border border-line-strong bg-surface px-2 py-1 text-[12.5px] text-ink-70 focus:outline-none"
        >
          {AGE_LIMITS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Explicit filter */}
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] text-ink">Filter explicit tracks</span>
        <Toggle
          on={explicitFilter}
          onChange={setExplicitFilter}
          label="Filter explicit tracks"
        />
      </div>

      {/* Run first sync now */}
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] text-ink">Run the first sync now</span>
        <Toggle
          on={runImmediateSync}
          onChange={setRunImmediateSync}
          label="Run the first sync now"
        />
      </div>

      {/* Vibe */}
      <div className="rounded-xl border border-line p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)]">
            <Image
              src="/logo.png"
              alt=""
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-cover"
            />
          </span>
          <span className="text-[13px] font-medium text-ink">
            Curate with a vibe
          </span>
          <span className="text-[11px] text-ink-35">optional</span>
        </div>
        <textarea
          rows={2}
          maxLength={300}
          value={vibePrompt}
          onChange={(e) => setVibePrompt(e.target.value)}
          placeholder="e.g. upbeat indie and synth-pop, nothing slow or sad"
          className="w-full resize-none rounded-lg border border-line-strong bg-surface p-2.5 text-[13px] text-ink placeholder:text-ink-50 focus:border-brand/40 focus:outline-none"
        />
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-35">
          {vibePrompt.trim()
            ? "The fox reads the candidates and picks the ones that fit."
            : `Without this the run takes the newest ${qty}. With it, the fox reads the candidates and picks the ${qty} that fit.`}
        </p>
      </div>
    </div>
  );

  // Shown instead of the editable rules when every selected destination is
  // already managed — its rules live on its own settings page.
  const managedSummary = (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] leading-relaxed text-ink-70">
        {existingManaged.length === 1
          ? "This playlist is already managed. Adding this source uses its existing rules — tweak them in its settings."
          : "These playlists are already managed. Adding this source uses each one's existing rules."}
      </p>
      {existingManaged.map(({ playlist, managed }) => (
        <div key={playlist.id} className="rounded-xl border border-line p-3">
          <div className="flex items-center gap-2">
            {playlist.imageUrl ? (
              <img
                src={playlist.imageUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span className="art-placeholder h-8 w-8 shrink-0 rounded-md" />
            )}
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
              {playlist.name}
            </span>
            <Link
              href={`/library/${managed!.id}/settings`}
              className="shrink-0 text-[12px] font-medium text-brand-deep hover:text-brand"
            >
              Change in settings
            </Link>
          </div>
          <div className="mt-1.5 font-mono text-[11.5px] text-ink-50">
            {managed!.syncInterval.toLowerCase()} ·{" "}
            {managed!.syncQuantityPerSource} per source ·{" "}
            {managed!.syncMode.toLowerCase()}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] text-ink">Pull from this source now</span>
        <Toggle
          on={runImmediateSync}
          onChange={setRunImmediateSync}
          label="Pull from this source now"
        />
      </div>
    </div>
  );

  const rulesArea = rulesApply ? (
    <div className="flex flex-col gap-4">
      {existingManaged.length > 0 && (
        <div className="rounded-xl bg-ground-alt px-3 py-2.5 text-[12px] leading-relaxed text-ink-70">
          These rules set up the{" "}
          {adoptingRulesCount === 1
            ? "new managed playlist"
            : `${adoptingRulesCount} new managed playlists`}
          . Playlists that are already managed keep their own — change those in
          their settings.
        </div>
      )}
      {rulesForm}
    </div>
  ) : (
    managedSummary
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 cursor-default"
      />
      <div
        className={`flex max-h-full w-full flex-col bg-surface shadow-[-16px_0_50px_rgba(26,21,18,0.3)] min-[720px]:max-w-[424px] ${
          expanded ? "min-[720px]:max-w-[812px]" : ""
        } max-[719px]:mt-auto max-[719px]:max-h-[92vh] max-[719px]:rounded-t-[26px]`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {sources.length === 1 ? (
            sources[0].imageUrl ? (
              <img
                src={sources[0].imageUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-[10px] object-cover"
              />
            ) : (
              <span className="art-placeholder h-11 w-11 shrink-0 rounded-[10px]" />
            )
          ) : (
            <span className="flex h-11 shrink-0 items-center">
              {sources.slice(0, 3).map((s, i) => (
                <span
                  key={s.id}
                  className="h-8 w-8 rounded-md border-2 border-surface bg-ground-alt"
                  style={{ marginLeft: i === 0 ? 0 : -10 }}
                >
                  {s.imageUrl && (
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="h-full w-full rounded-[4px] object-cover"
                    />
                  )}
                </span>
              ))}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
              Subscribe to{" "}
              {sources.length === 1 ? "source" : `${sources.length} sources`}
            </div>
            <div className="truncate font-display text-[17px] font-semibold text-ink">
              {sources.length === 1
                ? sources[0].name
                : sources.map((s) => s.name).join(", ")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="hidden shrink-0 rounded-full border border-line-strong p-1.5 text-ink-50 hover:text-ink-70 min-[720px]:block"
          >
            {expanded ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-ink-35 hover:text-ink-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div
          className={`min-h-0 flex-1 overflow-hidden ${
            expanded ? "min-[720px]:flex" : ""
          }`}
        >
          {expanded ? (
            <>
              <div className="overflow-y-auto border-b border-line p-5 min-[720px]:w-[336px] min-[720px]:shrink-0 min-[720px]:border-b-0 min-[720px]:border-r">
                {destinationList}
              </div>
              <div className="overflow-y-auto p-5 min-[720px]:flex-1">
                {rulesArea}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
              {destinationList}
              {rulesArea}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line bg-ground px-5 py-4">
          <p className="mb-3 text-[12.5px] leading-relaxed text-ink-70">
            {sentence}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2.5 text-[13px] font-medium text-ink-50 hover:text-ink-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 rounded-full bg-brand py-2.5 text-[14px] font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
