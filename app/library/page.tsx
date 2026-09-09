import { AppFrame } from "../components/Navigation/AppFrame";
import { Subscriptions } from "../components/Playlist/Subscriptions";

/**
 * Library — the managed playlists a user owns, one collapsed row each with a
 * live sync-status block and an expandable source list (README "Library",
 * artboard 1a). Replaces the old "Subscribed" dashboard tab.
 */
export default function LibraryPage() {
  return (
    <AppFrame>
      <Subscriptions />
    </AppFrame>
  );
}
