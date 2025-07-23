import { ISpotifyPlaylist } from "utils/types";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AppStore {
  browsePlaylists: ISpotifyPlaylist[];
  isLoading: boolean;
  loadedAllPlaylists: boolean;
  offset: number;
  setOffset: (offset: number) => void;
  setLoading: (loading: boolean) => void;
  setBrowsePlaylists: (playlists: ISpotifyPlaylist[]) => void;
  addPlaylist: (playlist: ISpotifyPlaylist) => void;
  removePlaylist: (id: string) => void;
  refreshPlaylists: () => Promise<void>;
  setLoadedAllPlaylists: (loaded: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        browsePlaylists: [],
        isLoading: false,
        loadedAllPlaylists: false,
        offset: 0,
        setOffset: (offset) => set({ offset }),
        setLoading: (loading) => set({ isLoading: loading }),
        setLoadedAllPlaylists: (loaded) => set({ loadedAllPlaylists: loaded }),
        setBrowsePlaylists: (playlists) => set({ browsePlaylists: playlists }),
        addPlaylist: (playlist) =>
          set((state) => ({
            browsePlaylists: [...state.browsePlaylists, playlist],
          })),
        removePlaylist: (id) =>
          set((state) => ({
            browsePlaylists: state.browsePlaylists.filter((p) => p.id !== id),
          })),
        refreshPlaylists: async () => {
          set({ isLoading: true });
          try {
            const response = await fetch("/api/spotify/user/playlists");
            const playlists = await response.json();
            set({ browsePlaylists: [...playlists], isLoading: false });
          } catch (error) {
            set({ isLoading: false });
            console.error("Failed to refresh playlists", error);
          }
        },
      }),
      {
        name: "user-store",
        partialize: (state) => ({ playlists: state.browsePlaylists }),
      }
    )
  )
);
