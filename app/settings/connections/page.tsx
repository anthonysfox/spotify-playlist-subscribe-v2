import { AppFrame } from "../../components/Navigation/AppFrame";
import { AppleMusicConnect } from "../../components/AppleMusicConnect";
import { McpTokens } from "../../components/McpTokens";

/**
 * Connections — one page for the music services PlaylistFox can sync with plus
 * MCP access tokens. This is a light consolidation of what used to be spread
 * across `/profile` and the Clerk account menu; the fuller redesign (per-service
 * "what this grants", reconnect flows) is a later pass.
 */
export default function ConnectionsPage() {
  return (
    <AppFrame>
      <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="mb-1 font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">
            Connections
          </h1>
          <p className="mb-8 text-[13px] text-ink-50">
            The music services PlaylistFox can sync with, and tokens for the MCP
            server.
          </p>

          <div className="space-y-3">
            <AppleMusicConnect />
            <McpTokens />
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
