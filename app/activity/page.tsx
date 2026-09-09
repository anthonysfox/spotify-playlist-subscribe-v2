import { AppFrame } from "../components/Navigation/AppFrame";
import { ActivityFeed } from "../components/ActivityFeed";

/**
 * Activity — reverse-chronological log of every sync run across all of the
 * user's playlists (README "Screens" > Activity), backed by
 * `GET /api/users/me/sync-runs`.
 */
export default function ActivityPage() {
  return (
    <AppFrame>
      <ActivityFeed />
    </AppFrame>
  );
}
