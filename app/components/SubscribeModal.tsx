import React from "react";
import { X, Bell } from "lucide-react";

export const SubscribeModal = ({ selectedPlaylist }: any) => {
  return (
    // <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    //   <div className="bg-white rounded-lg max-w-md w-full p-6 relative shadow-xl">
    //     <button
    //       onClick={() => {
    //         setShowSettingsModal(false);
    //         setSelectedPlaylist(null);
    //       }}
    //       className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
    //     >
    //       <X size={24} />
    //     </button>

    //     <div className="text-center mb-6">
    //       <Bell size={36} className="text-green-600 mx-auto mb-4" />
    //       <h2 className="text-2xl font-bold mb-2 text-gray-800">
    //         Subscription Settings
    //       </h2>
    //       <p className="text-gray-600">
    //         You're subscribing to "{selectedPlaylist.name}"
    //       </p>
    //     </div>

    //     <div className="mb-6">
    //       <label className="block text-gray-700 mb-2 font-medium">
    //         Choose which playlist to add tracks to:
    //       </label>
    //       <div className="space-y-3">
    //         {userPlaylists.map((playlist) => (
    //           <div
    //             key={playlist.id}
    //             onClick={() => {
    //               // In a real app, this would store the selected destination
    //               document
    //                 .querySelectorAll(".playlist-option")
    //                 .forEach((el) => el.classList.remove("ring-2"));
    //               document
    //                 .getElementById(`playlist-${playlist.id}`)
    //                 .classList.add("ring-2");

    //               // Store selection in a data attribute for the save button
    //               document.getElementById("save-button").dataset.destination =
    //                 playlist.id;
    //             }}
    //             id={`playlist-${playlist.id}`}
    //             className="playlist-option flex items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-all border border-gray-200"
    //           >
    //             <img
    //               src={playlist.imageUrl}
    //               alt={playlist.name}
    //               className="w-12 h-12 object-cover rounded"
    //             />
    //             <div className="ml-3">
    //               <h3 className="font-medium text-gray-800">{playlist.name}</h3>
    //               <p className="text-gray-500 text-sm">
    //                 {playlist.tracks} tracks
    //               </p>
    //             </div>
    //           </div>
    //         ))}
    //       </div>
    //     </div>

    //     <div className="mb-6">
    //       <label className="block text-gray-700 mb-2 font-medium">
    //         How often should we add new tracks?
    //       </label>
    //       <div className="grid grid-cols-3 gap-2">
    //         {frequencyOptions.map((option) => (
    //           <div
    //             key={option.value}
    //             onClick={() => {
    //               // In a real app, this would store the selected frequency
    //               document
    //                 .querySelectorAll(".frequency-option")
    //                 .forEach((el) => {
    //                   el.classList.remove("bg-green-600", "text-white");
    //                   el.classList.add("bg-gray-50", "text-gray-800");
    //                 });
    //               const selectedEl = document.getElementById(
    //                 `freq-${option.value}`
    //               );
    //               selectedEl.classList.remove("bg-gray-50", "text-gray-800");
    //               selectedEl.classList.add("bg-green-600", "text-white");

    //               // Store selection in a data attribute for the save button
    //               document.getElementById("save-button").dataset.frequency =
    //                 option.value;
    //             }}
    //             id={`freq-${option.value}`}
    //             className={`frequency-option py-2 text-center rounded cursor-pointer transition-colors border ${
    //               option.value === "weekly"
    //                 ? "bg-green-600 text-white"
    //                 : "bg-gray-50 text-gray-800 border-gray-200"
    //             }`}
    //           >
    //             {option.label}
    //           </div>
    //         ))}
    //       </div>
    //       <p className="text-gray-500 text-xs mt-2">
    //         We'll add a few tracks from this playlist to your selected playlist
    //         at this frequency.
    //       </p>
    //     </div>

    //     <button
    //       id="save-button"
    //       data-destination=""
    //       data-frequency="weekly"
    //       onClick={(e) => {
    //         const destinationId =
    //           parseInt(e.target.dataset.destination) || userPlaylists[0].id;
    //         const frequency = e.target.dataset.frequency || "weekly";
    //         saveSubscriptionSettings(destinationId, frequency);
    //       }}
    //       className="w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-medium shadow-md transition-colors"
    //     >
    //       Save Subscription
    //     </button>
    //   </div>
    // </div>
  );
};
