import { notFound } from "next/navigation";
import { AppFrame } from "../../../components/Navigation/AppFrame";
import { PlaylistDetail } from "../../../components/Playlist/PlaylistDetail";

const TABS = ["sources", "runs", "settings"] as const;
type Tab = (typeof TABS)[number];

export default async function PlaylistDetailTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const { id, tab } = await params;
  if (!TABS.includes(tab as Tab)) notFound();
  return (
    <AppFrame>
      <PlaylistDetail id={id} tab={tab as Tab} />
    </AppFrame>
  );
}
