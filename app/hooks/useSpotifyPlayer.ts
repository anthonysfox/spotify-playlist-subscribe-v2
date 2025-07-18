import { useState, useEffect, useCallback } from "react";
import SpotifyPlayerInstance from "../../lib/spotifyPlayer";

export const useSpotifyPlayer = (token: string) => {
  const [playerInstance] = useState(() => SpotifyPlayerInstance.getInstance());
  const [state, setState] = useState({
    is_paused: true,
    is_active: false,
    current_track: {
      name: "",
      album: { images: [{ url: "" }] },
      artists: [{ name: "" }],
      duration_ms: 0,
      id: "",
    },
    device_id: null as string | null,
  });

  useEffect(() => {
    console.log("useSpotifyPlayer: Token received:", !!token);
    if (!token) return;

    // Initialize the player (this is synchronous now)
    playerInstance.initialize(token);
  }, [token, playerInstance]);

  useEffect(() => {
    console.log("useSpotifyPlayer: Setting up state subscription");
    const unsubscribe = playerInstance.subscribeToStateChange((newState) => {
      console.log("useSpotifyPlayer: State changed:", newState);
      setState({ ...newState });
    });

    return unsubscribe;
  }, [playerInstance, setState]);

  // --- AUTOMATICALLY TRANSFER PLAYBACK TO THIS DEVICE ---
  useEffect(() => {
    // Only transfer if we have a device ID and token
    console.log("LOOK AT THIS", state);
    if (state.device_id && token) {
      const transferPlayback = async () => {
        try {
          await fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [state.device_id],
              play: false, // Don't auto-play, just transfer
            }),
          });
          console.log("Playback transferred to device:", state.device_id);
        } catch (err) {
          console.error("Failed to transfer playback:", err);
        }
      };
      transferPlayback();
    }
  }, [state.device_id, token]);
  // ------------------------------------------------------

  const play = useCallback(async () => {
    await playerInstance.play();
  }, [playerInstance]);

  const pause = useCallback(async () => {
    await playerInstance.pause();
  }, [playerInstance]);

  const togglePlay = useCallback(async () => {
    await playerInstance.togglePlay();
  }, [playerInstance]);

  const nextTrack = useCallback(async () => {
    await playerInstance.nextTrack();
  }, [playerInstance]);

  const previousTrack = useCallback(async () => {
    await playerInstance.previousTrack();
  }, [playerInstance]);

  const seek = useCallback(
    async (positionMs: number) => {
      await playerInstance.seek(positionMs);
    },
    [playerInstance]
  );

  const setVolume = useCallback(
    async (volume: number) => {
      await playerInstance.setVolume(volume);
    },
    [playerInstance]
  );

  const result = {
    // State
    state,

    // Player instance
    player: playerInstance.getPlayer(),
    deviceID: playerInstance.getDeviceId(),

    // Methods
    play,
    pause,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
  };

  console.log("useSpotifyPlayer returning:", {
    player: !!result.player,
    deviceID: result.deviceID,
    state: result.state,
  });

  return result;
};
