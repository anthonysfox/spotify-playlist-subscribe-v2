declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (config: any) => any;
    };
  }
}

interface Track {
  name: string;
  album: {
    images: { url: string }[];
  };
  artists: { name: string }[];
  duration_ms: number;
  id: string;
}

interface PlayerState {
  is_paused: boolean;
  is_active: boolean;
  current_track: Track;
  device_id: string | null;
}

type PlayerStateCallback = (state: PlayerState) => void;

class SpotifyPlayerInstance {
  private static instance: SpotifyPlayerInstance;
  private player: any = null;
  private token: string | null = null;
  private state: PlayerState = {
    is_paused: true,
    is_active: false,
    current_track: {
      name: "",
      album: { images: [{ url: "" }] },
      artists: [{ name: "" }],
      duration_ms: 0,
      id: "",
    },
    device_id: null,
  };
  private stateCallbacks: PlayerStateCallback[] = [];
  private isInitialized = false;
  private isSDKLoaded = false;

  private constructor() {}

  public static getInstance(): SpotifyPlayerInstance {
    if (!SpotifyPlayerInstance.instance) {
      SpotifyPlayerInstance.instance = new SpotifyPlayerInstance();
    }
    return SpotifyPlayerInstance.instance;
  }

  public initialize(token: string): void {
    if (!token) {
      console.error("SpotifyPlayerInstance: Initialization failed. Token is missing.");
      return;
    }

    if (this.isInitialized && this.token === token) {
      return; // Already initialized with the same token
    }

    this.token = token;
    this.isInitialized = true;

    if (!this.isSDKLoaded) {
      this.loadSpotifySDK();
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      this.isSDKLoaded = true;
      this.createPlayer();
    };

    if (window.Spotify) {
      this.createPlayer();
    }
  }

  private loadSpotifySDK() {
    if (document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
      return; // Script already exists
    }
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);
  }

  private createPlayer() {
    if (this.player) {
      this.player.disconnect();
    }

    try {
      this.player = new window.Spotify.Player({
        name: "Web Playback SDK",
        getOAuthToken: (cb: (token: string) => void) => {
          if (!this.token) {
            console.error("OAuth token is not available.");
            return;
          }
          cb(this.token);
        },
        volume: 0.5,
      });

      this.addPlayerListeners();
      this.player.connect();

    } catch (error) {
      console.error("Error creating Spotify player:", error);
    }
  }

  private addPlayerListeners() {
    this.player.on("playback_error", ({ message }: { message: string }) => {
      console.error("Playback Error:", message);
    });

    this.player.addListener("ready", ({ device_id }: { device_id: string }) => {
      this.state.device_id = device_id;
      this.notifyStateChange();
    });

    this.player.addListener("not_ready", () => {
      this.state.device_id = null;
      this.notifyStateChange();
    });

    this.player.addListener("player_state_changed", (newState: any) => {
      if (!newState) {
        this.state.is_active = false;
        this.notifyStateChange();
        return;
      }

      this.state.current_track = newState.track_window.current_track;
      this.state.is_paused = newState.paused;
      this.state.is_active = true;
      this.notifyStateChange();
    });
  }

  public subscribeToStateChange(callback: PlayerStateCallback): () => void {
    this.stateCallbacks.push(callback);
    callback(this.state);
    return () => {
      const index = this.stateCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStateChange() {
    this.stateCallbacks.forEach((callback) => callback(this.state));
  }

  // --- Player Actions ---
  public getPlayer = () => this.player;
  public getState = () => this.state;
  public getDeviceId = () => this.state.device_id;

  public play = async () => this.player?.resume();
  public pause = async () => this.player?.pause();
  public togglePlay = async () => this.player?.togglePlay();
  public nextTrack = async () => this.player?.nextTrack();
  public previousTrack = async () => this.player?.previousTrack();
  public seek = async (pos: number) => this.player?.seek(pos);
  public setVolume = async (vol: number) => this.player?.setVolume(vol);

  public disconnect() {
    if (this.player) {
      this.player.disconnect();
    }
    this.isInitialized = false;
    this.player = null;
    this.token = null;
    this.state = {
      is_paused: true,
      is_active: false,
      current_track: { name: "", album: { images: [{ url: "" }] }, artists: [{ name: "" }], duration_ms: 0, id: "" },
      device_id: null,
    };
  }
}

export default SpotifyPlayerInstance;
