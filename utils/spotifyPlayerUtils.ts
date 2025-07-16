import SpotifyPlayerInstance from "./spotifyPlayer";

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
export const playTrackPreview = async (trackId: string) => {
  const instance = SpotifyPlayerInstance.getInstance();
  const deviceId = instance.getDeviceId();

  if (!deviceId) {
    console.error("No active device found");
    return;
  }

  try {
    // Add track to queue
    const queueRes = await fetch("/api/spotify/player/queue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uri: `spotify:track:${trackId}`,
        device_id: deviceId,
      }),
    });

    if (!queueRes.ok) {
      const errorData = await queueRes.json();
      console.error("Failed to add track to queue:", errorData);
      return;
    }

    // Skip to the queued track
    await instance.nextTrack();

    // Wait a moment for the track to load, then seek to 30 seconds
    setTimeout(async () => {
      try {
        await instance.seek(30000); // 30 seconds
      } catch (error) {
        console.error("Error seeking to 30 seconds:", error);
      }
    }, 1000);

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
