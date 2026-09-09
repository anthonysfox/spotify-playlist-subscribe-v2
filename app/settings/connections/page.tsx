import { AppFrame } from "../../components/Navigation/AppFrame";
import { ConnectionsView } from "../../components/Connections/ConnectionsView";

/**
 * Connections — the music services PlaylistFox can sync with plus MCP access
 * tokens. Replaces `/profile` and the Clerk account-menu entries.
 */
export default function ConnectionsPage() {
  return (
    <AppFrame>
      <ConnectionsView />
    </AppFrame>
  );
}
