import React from "react";

export const NavTabs = ({ activeTab, setActiveTab }: any) => {
  return (
    <div className="flex mb-6 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
      <button
        onClick={() => setActiveTab("discover")}
        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
          activeTab === "discover"
            ? "bg-green-50 text-green-600 border-b-2 border-green-600"
            : "text-gray-600 hover:text-gray-800"
        }`}
      >
        Discover
      </button>
      <button
        onClick={() => setActiveTab("subscribed")}
        className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
          activeTab === "subscribed"
            ? "bg-green-50 text-green-600 border-b-2 border-green-600"
            : "text-gray-600 hover:text-gray-800"
        }`}
      >
        Subscribed
      </button>
    </div>
  );
};
