import React from "react";

export const NavTabs = ({ activeTab, setActiveTab }: any) => {
  return (
    <div className="flex mb-6 bg-white rounded-lg p-1 shadow-xs border border-gray-200">
      <button
        onClick={() => setActiveTab("discover")}
        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
          activeTab === "discover"
            ? "bg-orange-50 text-[#CC5500] border-b-2 border-[#CC5500]"
            : "text-gray-600 hover:text-gray-800"
        }`}
      >
        Discover
      </button>
      <button
        onClick={() => setActiveTab("subscribed")}
        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
          activeTab === "subscribed"
            ? "bg-orange-50 text-[#CC5500] border-b-2 border-[#CC5500]"
            : "text-gray-600 hover:text-gray-800"
        }`}
      >
        Subscribed
      </button>
    </div>
  );
};
