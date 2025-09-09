"use client";
import React, { useState, useEffect } from "react";
import {
  IoIosArrowBack,
  IoIosArrowForward,
  IoIosPause,
  IoIosPlayCircle,
} from "react-icons/io";
import { useSpotifyPlayer } from "../hooks/useSpotifyPlayer";
import { FaSpotify } from "react-icons/fa";

// --- Helper Functions ---
const isMobile = () => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
};

const isBrowserSupported = () => {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent;
  const isChrome = userAgent.includes("Chrome") && !userAgent.includes("Edg");
  const isEdge = userAgent.includes("Edg");
  const isOpera = userAgent.includes("OPR");
  const isSafari =
    userAgent.includes("Safari") && !userAgent.includes("Chrome");
  return isChrome || isEdge || isOpera || isSafari;
};

const generateSpotifyUrl = (trackId: string) => {
  return `https://open.spotify.com/track/${trackId}`;
};

// --- Component ---
function WebPlayer({ token }: { token: string }) {
  const [isClient, setIsClient] = useState(false);
  const { state, togglePlay, nextTrack, previousTrack, transferPlayback } =
    useSpotifyPlayer(token);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const mobile = isClient && isMobile();
  const supported = isClient && isBrowserSupported();

  // --- Render Logic ---
  if (mobile) {
    return (
      <div className="main-wrapper flex flex-col items-center justify-center w-80 border-2 border-green-200 p-4 bg-green-50 absolute rounded-lg right-0">
        <div className="text-center">
          <h3 className="font-bold text-green-800 mb-2">Player on Mobile</h3>
          <p className="text-sm text-gray-600 mb-3">
            Open the current track in your Spotify app.
          </p>
          <a
            href={
              state.current_track?.id
                ? generateSpotifyUrl(state.current_track.id)
                : "https://open.spotify.com"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-[#1DB954] text-white font-medium rounded-lg hover:bg-[#1ed760] transition-colors"
          >
            <FaSpotify className="mr-2" /> Open in Spotify
          </a>
        </div>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="main-wrapper flex flex-col items-center justify-center w-80 border-2 border-orange-200 p-4 bg-orange-50 absolute rounded-lg right-0">
        <div className="text-center">
          <h3 className="font-bold text-[#CC5500] mb-2">Player Not Available</h3>
          <p className="text-sm text-gray-600 mb-3">
            Web player requires a recent version of Chrome, Safari, Edge, or
            Opera.
          </p>
        </div>
      </div>
    );
  }

  if (!state.is_active) {
    return (
      <div className="main-wrapper flex flex-col items-center justify-center w-80 border-2 border-blue-200 p-4 bg-blue-50 absolute rounded-lg right-0">
        <div className="text-center">
          <h3 className="font-bold text-blue-800 mb-2">Activate Web Player</h3>
          <p className="text-sm text-gray-600 mb-3">
            Click to start listening in your browser.
          </p>
          <button
            onClick={transferPlayback}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            Activate Player
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-wrapper flex justify-between w-72 border-2 border-black p-3 bg-white absolute rounded-sm right-0">
      {state.is_paused && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <IoIosPlayCircle className="text-white text-5xl" />
        </div>
      )}
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
