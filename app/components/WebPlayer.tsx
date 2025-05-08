"use client";
import React, { useState, useEffect } from "react";
import {
  IoIosArrowBack,
  IoIosArrowForward,
  IoIosPause,
  IoIosPlayCircle,
} from "react-icons/io";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (config: any) => any;
    };
  }
}

function WebPlayer({
  token,
  setDeviceID,
  player,
  setPlayer,
}: {
  token: string;
  setDeviceID: (deviceID: string) => void;
  player: any;
  setPlayer: (player: any) => void;
}) {
  const [is_paused, setPaused] = useState(false);
  const [is_active, setActive] = useState(false);
  const [current_track, setTrack] = useState({
    name: "",
    album: {
      images: [{ url: "" }],
    },
    artists: [{ name: "" }],
    duration_ms: 0,
    id: "",
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Web Playback SDK",
        getOAuthToken: (cb) => {
          cb(token);
        },
        volume: 0.5,
      });

      player.on("playback_error", ({ message }: { message: string }) => {
        console.error("Failed to perform playback", message);
      });

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        setDeviceID(device_id);
        console.log("Ready with Device ID", device_id);
      });

      player.addListener(
        "not_ready",
        ({ device_id }: { device_id: string }) => {
          console.log("Device ID has gone offline", device_id);
        }
      );

      player.addListener("player_state_changed", (state: any) => {
        if (!state) {
          return;
        }
        console.log(current_track);
        setTrack(state.track_window.current_track);
        setPaused(state.paused);

        player.getCurrentState().then((state: any) => {
          !state ? setActive(false) : setActive(true);
        });
      });
      player.connect();

      setPlayer(player);
    };
  }, []);

  useEffect(() => {
    if (player) {
      console.log("seek");
      player.seek(current_track.duration_ms / 2);
    }
  }, [current_track.id]);

  return (
    <>
      <div className="main-wrapper flex justify-between w-72 border-2 border-black p-3 bg-white absolute rounded right-0">
        {current_track && (
          <>
            {current_track?.album.images[0].url ? (
              <img
                src={current_track?.album.images[0].url || ""}
                className="now-playing__cover w-20"
                alt=""
              />
            ) : (
              <div className="h-10"></div>
            )}

            <div className="now-playing__side flex flex-col justify-between w-40">
              <div className="now-playing__name truncate">
                {current_track.name || ""}
              </div>

              <div className="now-playing__artist truncate">
                {current_track?.artists[0].name || ""}
              </div>

              <div className="flex flex-row justify-between">
                <button
                  className="btn-spotify"
                  onClick={() => {
                    player.previousTrack();
                  }}
                >
                  <IoIosArrowBack />
                </button>
                <button
                  className="btn-spotify"
                  onClick={() => {
                    player.togglePlay();
                  }}
                >
                  {is_paused ? <IoIosPlayCircle /> : <IoIosPause />}
                </button>

                <button
                  className="btn-spotify"
                  onClick={() => {
                    player.nextTrack();
                  }}
                >
                  <IoIosArrowForward />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default WebPlayer;
