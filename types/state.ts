import type { ISpotifyPlaylist } from "./spotify";

/**
 * Generic client-side list/pagination view-state, shared by the stores and the
 * components that render infinite-scrolling playlist lists.
 */
export interface IState {
  offset: number;
  loading: boolean;
  loadedAll: boolean;
}

export interface IPlaylistState<T> extends IState {
  playlists: T[];
}

export type IUserPlaylistsState = IPlaylistState<ISpotifyPlaylist>;

export interface ITopArtistState extends IPlaylistState<ISpotifyPlaylist> {
  artists: string[];
}
