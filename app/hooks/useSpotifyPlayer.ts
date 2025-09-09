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
    if (!token) return;
    playerInstance.initialize(token);
  }, [token, playerInstance]);

  useEffect(() => {
    const unsubscribe = playerInstance.subscribeToStateChange((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, [playerInstance]);

  const transferPlayback = useCallback(async () => {
    if (state.device_id && token) {
      try {
        await fetch("https://api.spotify.com/v1/me/player", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_ids: [state.device_id],
            play: true, // Start playback immediately
          }),
        });
      } catch (err) {
        console.error("Failed to transfer playback:", err);
      }
    }
  }, [state.device_id, token]);

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

  return {
    state,
    player: playerInstance.getPlayer(),
    deviceID: playerInstance.getDeviceId(),
    play,
    pause,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    transferPlayback,
  };
};
