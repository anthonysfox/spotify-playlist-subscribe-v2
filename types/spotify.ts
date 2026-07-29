/**
 * Raw response shapes from the Spotify Web API.
 *
 * These mirror what Spotify returns over the wire — snake_case fields and all —
 * so they're deliberately kept separate from the app's own domain types (see
 * `./playlist`). Only the shapes actually consumed by the client are modelled;
 * the sub-interfaces stay unexported because nothing outside this file needs them.
 */
export interface ISpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: IImage[];
  owner: IProfile;
  tracks: ISpotifyTracks;
  external_urls: IExternalUrls;
  href: string;
  type: string;
  uri: string;
  subscribed: boolean;
}

interface IImage {
  height: number;
  url: string;
  width: number;
}

interface IProfile {
  external_urls: IExternalUrls;
  href: string;
  id: string;
  type: string;
  uri: string;
  display_name: string;
  followers: {
    href: string;
    total: number;
  };
}

interface IExternalUrls {
  spotify: string;
}

interface ISpotifyTracks {
  href: string;
  items: IPlaylistTrack[];
  limit: number;
  next: string;
  offset: number;
  previous: string;
  total: number;
}

interface IPlaylistTrack {
  added_at: string;
  added_by: IProfile;
  track: ITrack;
}

interface ITrack {
  album: IAlbum;
  artists: IArtist[];
}

interface IAlbum {
  album_type: string;
  artists: IArtist[];
  external_urls: IExternalUrls;
  href: string;
  id: string;
  images: IImage[];
  name: string;
  release_date: string;
  total_tracks: number;
  type: string;
  uri: string;
}

interface IArtist {
  external_urls: IExternalUrls;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}
