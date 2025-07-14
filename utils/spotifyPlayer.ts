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

  private constructor() {}

  public static getInstance(): SpotifyPlayerInstance {
    if (!SpotifyPlayerInstance.instance) {
      SpotifyPlayerInstance.instance = new SpotifyPlayerInstance();
    }
    return SpotifyPlayerInstance.instance;
  }

  public initialize(token: string): void {
    console.log(
      "SpotifyPlayerInstance: initialize called with token:",
      !!token
    );
    if (this.isInitialized && this.token === token) {
      console.log("SpotifyPlayerInstance: Already initialized with same token");
      return;
    }

    this.token = token;
    this.isInitialized = true;
    console.log(
      "SpotifyPlayerInstance: Token set, isInitialized:",
      this.isInitialized
    );

    // Load the Spotify SDK if not already loaded
    if (!window.Spotify) {
      console.log("SpotifyPlayerInstance: Loading Spotify SDK...");
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    } else {
      console.log("SpotifyPlayerInstance: Spotify SDK already loaded");
    }

    // Set up the SDK ready callback
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("SpotifyPlayerInstance: SDK ready callback triggered");
      this.createPlayer();
    };

    // If SDK is already loaded, create player immediately
    if (window.Spotify) {
      console.log("SpotifyPlayerInstance: Creating player immediately");
      this.createPlayer();
    }
  }

  private createPlayer() {
    try {
      console.log("SpotifyPlayerInstance: Creating Spotify player...");
      this.player = new window.Spotify.Player({
        name: "Web Playback SDK",
        getOAuthToken: (cb: (token: string) => void) => {
          console.log("SpotifyPlayerInstance: Providing OAuth token");
          cb(this.token!);
        },
        volume: 0.5,
      });

      console.log("SpotifyPlayerInstance: Player created:", !!this.player);

      this.player.on("playback_error", ({ message }: { message: string }) => {
        console.error("Failed to perform playback", message);
      });

      this.player.addListener(
        "ready",
        ({ device_id }: { device_id: string }) => {
          console.log(
            "SpotifyPlayerInstance: Player ready with device ID:",
            device_id
          );
          this.state.device_id = device_id;
          console.log("Ready with Device ID", device_id);
          this.notifyStateChange();
        }
      );

      this.player.addListener(
        "not_ready",
        ({ device_id }: { device_id: string }) => {
          console.log("SpotifyPlayerInstance: Device went offline:", device_id);
          console.log("Device ID has gone offline", device_id);
          this.state.device_id = null;
          this.notifyStateChange();
        }
      );

      this.player.addListener("player_state_changed", (state: any) => {
        if (!state) {
          return;
        }

        console.log("SpotifyPlayerInstance: Player state changed");
        this.state.current_track = state.track_window.current_track;
        this.state.is_paused = state.paused;

        this.player.getCurrentState().then((state: any) => {
          this.state.is_active = !!state;
          this.notifyStateChange();
        });
      });

      console.log("SpotifyPlayerInstance: Connecting player...");
      this.player.connect();
      console.log("SpotifyPlayerInstance: Player connected");
    } catch (error) {
      console.error("SpotifyPlayerInstance: Error creating player:", error);
    }
  }

  public subscribeToStateChange(callback: PlayerStateCallback): () => void {
    this.stateCallbacks.push(callback);
    // Immediately call with current state
    callback(this.state);

    // Return unsubscribe function
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

  public getPlayer(): any {
    return this.player;
  }

  public getState(): PlayerState {
    return this.state;
  }

  public getDeviceId(): string | null {
    return this.state.device_id;
  }

  public async play(): Promise<void> {
    if (this.player) {
      await this.player.resume();
    }
  }

  public async pause(): Promise<void> {
    if (this.player) {
      await this.player.pause();
    }
  }

  public async togglePlay(): Promise<void> {
    if (this.player) {
      await this.player.togglePlay();
    }
  }

  public async nextTrack(): Promise<void> {
    if (this.player) {
      await this.player.nextTrack();
    }
  }

  public async previousTrack(): Promise<void> {
    if (this.player) {
      await this.player.previousTrack();
    }
  }

  public async seek(positionMs: number): Promise<void> {
    if (this.player) {
      await this.player.seek(positionMs);
    }
  }

  public async setVolume(volume: number): Promise<void> {
    if (this.player) {
      await this.player.setVolume(volume);
    }
  }

  public disconnect(): void {
    if (this.player) {
      this.player.disconnect();
    }
    this.isInitialized = false;
    this.player = null;
    this.token = null;
    this.state = {
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
  }
}

export default SpotifyPlayerInstance;
