"use client";
import React, { useState, useEffect } from "react";
import {
  IoIosArrowBack,
  IoIosArrowForward,
  IoIosPause,
  IoIosPlayCircle,
} from "react-icons/io";
import { useSpotifyPlayer } from "../hooks/useSpotifyPlayer";

// Check if browser supports Spotify Web Playback SDK
const isBrowserSupported = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent;
  const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
  const isEdge = userAgent.includes('Edg');
  const isOpera = userAgent.includes('OPR');
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  
  return isChrome || isEdge || isOpera || isSafari;
};

function WebPlayer({ token }: { token: string }) {
  const [browserSupported, setBrowserSupported] = useState(true);
  const { state, togglePlay, nextTrack, previousTrack } =
    useSpotifyPlayer(token);

  useEffect(() => {
    setBrowserSupported(isBrowserSupported());
  }, []);

  // Show browser compatibility message
  if (!browserSupported) {
    return (
      <div className="main-wrapper flex flex-col items-center justify-center w-80 border-2 border-orange-200 p-4 bg-orange-50 absolute rounded-lg right-0">
        <div className="text-center">
          <h3 className="font-bold text-[#CC5500] mb-2">Player Not Available</h3>
          <p className="text-sm text-gray-600 mb-3">
            Web player requires Chrome, Safari, Edge, or Opera
          </p>
          <a 
            href="https://open.spotify.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 bg-[#1DB954] text-white text-sm font-medium rounded-lg hover:bg-[#1ed760] transition-colors"
          >
            Open Spotify Web
          </a>
        </div>
      </div>
    );
  }

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
