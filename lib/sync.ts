export async function triggerSync(opts: {
  playlistId?: string;
  sourceId?: string;
  userId?: string;
  force?: boolean;
}) {
  const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/sync`);
  if (opts.playlistId) url.searchParams.set("playlistId", opts.playlistId);
  if (opts.userId) url.searchParams.set("userId", opts.userId);
  if (opts.force) url.searchParams.set("force", "true");
  if (opts.sourceId) url.searchParams.set("sourceId", opts.sourceId);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  return res.json();
}
