import SpotifyPlayerInstance from "../lib/spotifyPlayer";

/**
 * Get the global Spotify player instance
 * This can be used anywhere in the app to access the player
 */
export const getSpotifyPlayer = () => {
  return SpotifyPlayerInstance.getInstance();
};

/**
 * Get the current player state
 */
export const getPlayerState = () => {
  const instance = SpotifyPlayerInstance.getInstance();
  return instance.getState();
};

/**
 * Get the current device ID
 */
export const getDeviceId = () => {
  const instance = SpotifyPlayerInstance.getInstance();
  return instance.getDeviceId();
};

/**
 * Check if the player is initialized and ready
 */
export const isPlayerReady = () => {
  const instance = SpotifyPlayerInstance.getInstance();
  const state = instance.getState();
  return !!state.device_id && state.is_active;
};

/**
 * Play a track preview (add to queue, skip to it, seek to 30 seconds, auto-stop after 30 seconds)
 */
export const playTrackPreview = async (trackId: string, transferPlayback: () => Promise<void>) => {
  const instance = SpotifyPlayerInstance.getInstance();
  let deviceId = instance.getDeviceId();

  if (!deviceId) {
    await transferPlayback();
    deviceId = instance.getDeviceId();
    if (!deviceId) {
      console.error("No active device found after transfer");
      return;
    }
  }

  try {
    const playRes = await fetch("/api/spotify/player/play-preview", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackId,
        deviceId,
      }),
    });

    if (!playRes.ok) {
      const errorData = await playRes.json();
      console.error("Failed to play track:", errorData);
      return;
    }

    // Seek to 30 seconds after a short delay
    setTimeout(async () => {
      try {
        await instance.seek(30000);
      } catch (error) {
        console.error("Error seeking to 30 seconds:", error);
      }
    }, 500);

    // Auto-stop after 30 seconds
    setTimeout(async () => {
      try {
        await instance.pause();
      } catch (error) {
        console.error("Error stopping track preview:", error);
      }
    }, 30000);
  } catch (error) {
    console.error("Error playing track preview:", error);
  }
};

/**
 * Stop the current playback
 */
export const stopPlayback = async () => {
  const instance = SpotifyPlayerInstance.getInstance();
  await instance.pause();
};

/**
 * Subscribe to player state changes
 * Returns an unsubscribe function
 */
export const subscribeToPlayerState = (callback: (state: any) => void) => {
  const instance = SpotifyPlayerInstance.getInstance();
  return instance.subscribeToStateChange(callback);
};
