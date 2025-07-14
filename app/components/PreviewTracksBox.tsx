import React, { useState } from "react";

export const PreviewTracksBox = ({
  previewTracks,
  open,
  setPreviewOpen,
  deviceID,
  player,
}: {
  previewTracks: any;
  open: boolean;
  setPreviewOpen: (open: boolean) => void;
  deviceID: string;
  player: any;
}) => {
  const addTrackToQueue = async (event: any, track: any) => {
    event.stopPropagation();

    const resp = await fetch(
      `/api/spotify/player/queue?track=${track.uri}&device_id=${deviceID}`,
      {
        method: "POST",
      }
    )
      .then((resp) => resp.json())
      .then((data) => {
        player.nextTrack().then(() => {
          player.getCurrentState().then((state) => {
            console.log(state);
          });
        });

        // player.seek(track.duration_ms / 2);
      });
  };
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="h-full w-full overflow-scroll">
        <div className="flex flex-wrap min-h-full items-end justify-center p-1 text-center sm:items-center sm:p-0">
          {previewTracks.map(({ track }) => {
            return (
              <div
                key={track.id}
                className="flex flex-col p-1 justify-center items-center border hover:border-red-300"
                onClick={(e) => addTrackToQueue(e, track)}
              >
                <img
                  src={track.album.images[track.album.images.length - 1].url}
                  alt=""
                  className="w-15 hover:border-red rounded-sm"
                />
                {/* <div className="text-sm">{track.name}</div>
                <div className="text-sm">{track.artists[0].name}</div> */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
