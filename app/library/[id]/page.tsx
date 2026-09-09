import { AppFrame } from "../../components/Navigation/AppFrame";
import { PlaylistDetail } from "../../components/Playlist/PlaylistDetail";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppFrame>
      <PlaylistDetail id={id} tab="overview" />
    </AppFrame>
  );
}
