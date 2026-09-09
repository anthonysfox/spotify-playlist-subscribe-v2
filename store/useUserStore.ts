// The Prisma client is generated to ./generated/prisma (see schema.prisma), not
// to @prisma/client — which is where these types were being imported from, and
// that package has no models in it. Every one of these types silently resolved
// to nothing, which is why the components had no idea a playlist has a
// syncInterval, a provider, or an externalPlaylistId.
import type { ManagedPlaylist } from "@/generated/prisma/client";
// The user's playlists are provider-agnostic now — they may be Spotify or
// Apple Music, and PlaylistSummary is the shape both adapters return.
import type { PlaylistSummary } from "@/lib/music/types";
import type { ManagedPlaylistWithSubscriptions } from "@/types";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import toast from "react-hot-toast";

/** A source removal that is shown as gone in the UI but has an ~8s window
 *  before the DELETE actually commits, so it can be undone with no server
 *  round trip. Keyed by `${managedPlaylistId}:${sourcePlaylistId}`. */
export type PendingSourceRemoval = {
  managedPlaylistId: string;
  sourcePlaylistId: string;
  sourceName: string;
  timeoutId: ReturnType<typeof setTimeout>;
};

export const UNDO_WINDOW_MS = 8000;

export const pendingRemovalKey = (
  managedPlaylistId: string,
  sourcePlaylistId: string
) => `${managedPlaylistId}:${sourcePlaylistId}`;

export type UserStoreState = {
  userPlaylists: PlaylistSummary[];
  managedPlaylists: ManagedPlaylistWithSubscriptions[];
  user: Record<string, any> | null;
  isLoading: boolean;
  loadedAllPlaylists: boolean;
  offset: number;
  pendingSourceRemovals: Record<string, PendingSourceRemoval>;
};

export type UserStoreActions = {
  setOffset: (offset: number) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: any) => void;
  setUserPlaylists: (playlists: PlaylistSummary[]) => void;
  addPlaylist: (playlist: PlaylistSummary) => void;
  removePlaylist: (id: string) => void;
  refreshPlaylists: () => Promise<void>;
  setLoadedAllPlaylists: (loaded: boolean) => void;
  setManagedPlaylists: (
    managedPlaylists: ManagedPlaylistWithSubscriptions[]
  ) => void;
  updateManagedPlaylist: (
    playlistId: string,
    updates: Partial<ManagedPlaylist>
  ) => void;
  addManagedPlaylist: (newPlaylist: ManagedPlaylistWithSubscriptions) => void;
  removeSubscriptionFromManagedPlaylist: (
    managedPlaylistId: string,
    subscriptionId: string
  ) => void;
  unsubscribeFromSource: (
    sourcePlaylistId: string,
    managedPlaylistId: string
  ) => Promise<void>;
  /** Optimistically remove a source with an undo window. The row disappears
   *  immediately; the DELETE only fires after UNDO_WINDOW_MS unless undone. */
  removeSourceWithUndo: (
    managedPlaylistId: string,
    sourcePlaylistId: string,
    sourceName: string
  ) => void;
  /** Cancel a pending removal (key from `pendingRemovalKey`). */
  undoSourceRemoval: (key: string) => void;
};

export type UserStore = UserStoreState & UserStoreActions;

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        userPlaylists: [],
        managedPlaylists: [],
        user: null,
        isLoading: false,
        loadedAllPlaylists: false,
        offset: 0,
        pendingSourceRemovals: {},
        setOffset: (offset) => set({ offset }),
        setLoading: (loading) => set({ isLoading: loading }),
        setLoadedAllPlaylists: (loaded) => set({ loadedAllPlaylists: loaded }),
        setUser: (user) => set({ user }),
        setUserPlaylists: (playlists) => set({ userPlaylists: playlists }),
        addPlaylist: (playlist) =>
          set((state) => ({
            userPlaylists: [...state.userPlaylists, playlist],
          })),
        removePlaylist: (id) =>
          set((state) => ({
            userPlaylists: state.userPlaylists.filter((p) => p.id !== id),
          })),
        refreshPlaylists: async () => {
          set({ isLoading: true });
          try {
            const response = await fetch("/api/spotify/user/playlists");
            const playlists = await response.json();
            set({ userPlaylists: [...playlists], isLoading: false });
          } catch (error) {
            set({ isLoading: false });
            console.error("Failed to refresh playlists", error);
          }
        },
        setManagedPlaylists: (managedPlaylists) => set({ managedPlaylists }),
        addManagedPlaylist: (newPlaylist) =>
          set((state) => {
            const existingIndex = state.managedPlaylists.findIndex(
              (playlist) => playlist.id === newPlaylist.id
            );

            if (existingIndex >= 0) {
              // Update existing playlist
              const updatedPlaylists = [...state.managedPlaylists];
              updatedPlaylists[existingIndex] = newPlaylist;
              return { managedPlaylists: updatedPlaylists };
            } else {
              // Add new playlist
              return {
                managedPlaylists: [...state.managedPlaylists, newPlaylist],
              };
            }
          }),
        updateManagedPlaylist: (playlistId, updates) =>
          set((state) => ({
            managedPlaylists: state.managedPlaylists.map((playlist) =>
              playlist.id === playlistId
                ? { ...playlist, ...updates }
                : { ...playlist }
            ),
          })),
        removeSubscriptionFromManagedPlaylist: (
          managedPlaylistId,
          subscriptionId
        ) =>
          set((state) => {
            const updatedManagedPlaylists = state.managedPlaylists
              .map((managedPlaylist) => {
                if (managedPlaylist.id === managedPlaylistId) {
                  const updatedSubscriptions =
                    managedPlaylist.subscriptions.filter(
                      (subscription: any) => subscription.id !== subscriptionId
                    );

                  return {
                    ...managedPlaylist,
                    subscriptions: [...updatedSubscriptions],
                  };
                }
                return managedPlaylist;
              })
              .filter(
                (managedPlaylist) => managedPlaylist.subscriptions.length
              );

            return { managedPlaylists: updatedManagedPlaylists };
          }),
        unsubscribeFromSource: async (
          sourcePlaylistId: string,
          managedPlaylistId: string
        ) => {
          try {
            const response = await fetch(
              `/api/users/me/managed-playlists/${managedPlaylistId}/subscriptions/${sourcePlaylistId}`,
              {
                method: "DELETE",
              }
            );

            const { success, data } = await response.json();

            if (!success) {
              throw new Error(data.error || "Failed to unsubscribe");
            }

            // Update local state
            get().removeSubscriptionFromManagedPlaylist(
              data.managedPlaylistId,
              data.subscriptionId
            );

            toast.success("Successfully unsubscribed");
          } catch (error: any) {
            console.error("Error unsubscribing:", error.message || error);
            toast.error(error.message || "Failed to unsubscribe");
            throw error;
          }
        },
        removeSourceWithUndo: (
          managedPlaylistId,
          sourcePlaylistId,
          sourceName
        ) => {
          const key = pendingRemovalKey(managedPlaylistId, sourcePlaylistId);
          // Already pending — ignore the repeat click.
          if (get().pendingSourceRemovals[key]) return;

          const commit = async () => {
            try {
              const response = await fetch(
                `/api/users/me/managed-playlists/${managedPlaylistId}/subscriptions/${sourcePlaylistId}`,
                { method: "DELETE" }
              );
              const { success, data } = await response.json();
              if (!success) {
                throw new Error(data?.error || "Failed to unsubscribe");
              }
              get().removeSubscriptionFromManagedPlaylist(
                data.managedPlaylistId,
                data.subscriptionId
              );
            } catch (error: any) {
              console.error("Error unsubscribing:", error?.message || error);
              toast.error(error?.message || "Failed to remove source");
            } finally {
              set((state) => {
                const next = { ...state.pendingSourceRemovals };
                delete next[key];
                return { pendingSourceRemovals: next };
              });
            }
          };

          const timeoutId = setTimeout(commit, UNDO_WINDOW_MS);

          set((state) => ({
            pendingSourceRemovals: {
              ...state.pendingSourceRemovals,
              [key]: {
                managedPlaylistId,
                sourcePlaylistId,
                sourceName,
                timeoutId,
              },
            },
          }));
        },
        undoSourceRemoval: (key) => {
          const pending = get().pendingSourceRemovals[key];
          if (!pending) return;
          clearTimeout(pending.timeoutId);
          set((state) => {
            const next = { ...state.pendingSourceRemovals };
            delete next[key];
            return { pendingSourceRemovals: next };
          });
        },
      }),
      {
        name: "user-store",
        partialize: (state) => ({ playlists: state.userPlaylists }),
      }
    )
  )
);
