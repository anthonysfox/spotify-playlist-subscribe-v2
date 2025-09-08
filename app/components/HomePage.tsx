import { SignInButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";

export const HomePage = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-orange-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto text-center space-y-4 sm:space-y-5 md:space-y-6">
        {/* Hero Icon */}
        <div className="w-full max-w-[100px] sm:max-w-[120px] md:max-w-[140px] mx-auto">
          <Image
            src="/logo.png"
            alt="PlaylistFox"
            width={140}
            height={140}
            className="w-full h-auto object-contain backdrop-blur-sm rounded-lg shadow-lg border border-orange-100"
          />
        </div>

        {/* Hero Text */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-gray-900 via-[#CC5500] to-[#A0522D] bg-clip-text text-transparent">
              Playlist
            </span>
            <span className="text-gray-900">Fox</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed px-2 sm:px-4">
            Keep your Spotify playlists fresh with automatic track updates
          </p>
        </div>

        {/* Feature Cards - Stacked on Mobile */}
        <div className="space-y-2 sm:space-y-3">
          <div className="bg-white/70 backdrop-blur-sm border border-orange-100 rounded-xl p-3 sm:p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#CC5500] to-[#A0522D] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Auto-Sync</h3>
                <p className="text-sm text-gray-600">
                  Fresh tracks added on your schedule
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-orange-100 rounded-xl p-3 sm:p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#CC5500] to-[#A0522D] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">
                  Smart Discovery
                </h3>
                <p className="text-sm text-gray-600">
                  Find new music from artists you love
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-orange-100 rounded-xl p-3 sm:p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#CC5500] to-[#A0522D] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Organized</h3>
                <p className="text-sm text-gray-600">
                  Manage playlists in one place
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2 px-2">
          <SignInButton>
            <button className="w-full py-2.5 sm:py-3 px-4 sm:px-6 bg-gradient-to-r from-[#CC5500] to-[#A0522D] hover:from-[#B04A00] hover:to-[#8B4513] text-white font-bold text-base sm:text-lg rounded-xl">
              <span className="flex items-center justify-center gap-3">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615c-.16.265-.518.343-.783.183-2.14-1.303-4.834-1.598-8.006-.875-.306.07-.613-.119-.683-.425-.07-.306.119-.613.425-.683 3.46-.79 6.452-.449 8.822.998.265.16.343.518.183.783zm1.118-2.48c-.201.327-.63.43-.957.23-2.45-1.507-6.184-1.944-9.077-.964-.378.128-.777-.074-.905-.452-.128-.378.074-.777.452-.905 3.315-1.124 7.474-.615 10.256 1.133.327.201.43.63.23.957zm.096-2.582C14.626 9.892 9.712 9.65 6.665 10.79c-.443.165-.94-.06-1.105-.503-.165-.443.06-.94.503-1.105 3.506-1.313 9.064-1.063 12.677 1.226.394.25.513.784.263 1.178-.25.394-.784.513-1.178.263z" />
                </svg>
                Continue with Spotify
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>
          </SignInButton>

          <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3">
            <p className="text-amber-800 text-xs font-medium flex items-center justify-center gap-2">
              <svg
                className="w-3 h-3 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Spotify Premium required
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Enhancement */}
      <div className="hidden lg:block absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-[#CC5500]/10 to-transparent rounded-full blur-2xl"></div>
      <div className="hidden lg:block absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-tr from-[#A0522D]/5 to-transparent rounded-full blur-2xl"></div>
    </div>
  );
};
