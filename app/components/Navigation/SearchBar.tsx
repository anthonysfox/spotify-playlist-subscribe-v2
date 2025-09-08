"use client";
import React, { useState } from "react";
import { Search, X } from "lucide-react";

export const SearchBar = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <>
      <div className="relative">
        <div className="flex items-center bg-white rounded-full overflow-hidden shadow-md border border-gray-200">
          <input
            type="text"
            id="search-dropdown"
            className="grow py-3 px-6 bg-transparent outline-hidden text-gray-700"
            placeholder="Search Playlists..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {value && (
            <button
              onClick={() => {
                onChange("");
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
          <button className="bg-gradient-to-r from-[#CC5500] to-[#A0522D] p-3 hover:from-[#B04A00] hover:to-[#8B4513] text-white transition-colors">
            <Search size={20} />
          </button>
        </div>
      </div>
    </>
  );
};
