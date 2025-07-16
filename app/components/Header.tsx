"use client";
import React, { useState } from "react";

export const Header = ({
  searchText,
  selectedPlaylists = [],
}: {
  searchText: string;
  selectedPlaylists: string[];
}) => {
  return (
    <h1 className="text-center text-4xl">
      {searchText
        ? "Select a playlist..."
        : selectedPlaylists.length
        ? "Pick one of your playlists to add songs to..."
        : "Search for or select a playlist..."}
    </h1>
  );
};
