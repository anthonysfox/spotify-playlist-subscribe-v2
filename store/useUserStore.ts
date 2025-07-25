import { ISpotifyPlaylist } from "utils/types";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type UserStoreState = {
  userPlaylists: ISpotifyPlaylist[];
  subscriptions: any[];
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
  setSubscriptions: (subscriptions: any[]) => void;
  removeSourceFromSubscription: (
    subscriptionId: string,
    sourceId: string
  ) => void;
};

export type UserStore = UserStoreState & UserStoreActions;

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        userPlaylists: [],
        subscriptions: [],
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
        setSubscriptions: (subscriptions) => set({ subscriptions }),
        removeSourceFromSubscription: (subscriptionId, sourceId) =>
          set((state) => {
            const updatedSubscriptions = state.subscriptions
              .map((subscription) => {
                if (subscription.destination.id === subscriptionId) {
                  const updatedSources = subscription.sources.filter(
                    (source) => source.id !== sourceId
                  );

                  return {
                    ...subscription,
                    sources: updatedSources,
                  };
                }
                return subscription;
              })
              .filter((subscription) => subscription.sources.length > 0);

            return { subscriptions: updatedSubscriptions };
          }),
      }),
      {
        name: "user-store",
        partialize: (state) => ({ playlists: state.userPlaylists }),
      }
    )
  )
);
