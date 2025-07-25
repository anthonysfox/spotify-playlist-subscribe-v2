"use client";
import React from "react";
import {
  IoIosArrowBack,
  IoIosArrowForward,
  IoIosPause,
  IoIosPlayCircle,
} from "react-icons/io";
import { useSpotifyPlayer } from "../hooks/useSpotifyPlayer";

function WebPlayer({ token }: { token: string }) {
  const { state, togglePlay, nextTrack, previousTrack } =
    useSpotifyPlayer(token);

  if (!state.is_active) {
    return null; // Don't render if no active device
  }

  return (
    <div className="main-wrapper flex justify-between w-72 border-2 border-black p-3 bg-white absolute rounded-sm right-0">
      {state.current_track && (
        <>
          {state.current_track?.album.images[0].url ? (
            <img
              src={state.current_track?.album.images[0].url || ""}
              className="now-playing__cover w-20"
              alt=""
            />
          ) : (
            <div className="h-10"></div>
          )}

          <div className="now-playing__side flex flex-col justify-between w-40">
            <div className="now-playing__name truncate">
              {state.current_track.name || ""}
            </div>

            <div className="now-playing__artist truncate">
              {state.current_track?.artists[0].name || ""}
            </div>

            <div className="flex flex-row justify-between">
              <button className="btn-spotify" onClick={previousTrack}>
                <IoIosArrowBack />
              </button>
              <button className="btn-spotify" onClick={togglePlay}>
                {state.is_paused ? <IoIosPlayCircle /> : <IoIosPause />}
              </button>

              <button className="btn-spotify" onClick={nextTrack}>
                <IoIosArrowForward />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default WebPlayer;
