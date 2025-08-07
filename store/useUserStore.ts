import {
  ManagedPlaylist,
  ManagedPlaylistSourceSubscription,
  SourcePlaylist,
} from "@prisma/client";
import { ISpotifyPlaylist } from "utils/types";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import toast from "react-hot-toast";

export type UserStoreState = {
  userPlaylists: ISpotifyPlaylist[];
  managedPlaylists: ManagedPlaylistWithSubscriptions[];
  user: Record<string, any> | null;
  isLoading: boolean;
  loadedAllPlaylists: boolean;
  offset: number;
};

export type UserStoreActions = {
  setOffset: (offset: number) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: any) => void;
  setUserPlaylists: (playlists: ISpotifyPlaylist[]) => void;
  addPlaylist: (playlist: ISpotifyPlaylist) => void;
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
};

interface ManagedPlaylistWithSubscriptions extends ManagedPlaylist {
  subscriptions: (ManagedPlaylistSourceSubscription & {
    sourcePlaylist: SourcePlaylist;
  })[];
}

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
              `/api/users/managed-playlists/${managedPlaylistId}/subscriptions/${sourcePlaylistId}`,
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
      }),
      {
        name: "user-store",
        partialize: (state) => ({ playlists: state.userPlaylists }),
      }
    )
  )
);
