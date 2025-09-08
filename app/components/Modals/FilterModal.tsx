import React from "react";
import { X, Filter } from "lucide-react";
import { CategoryFilters } from "../Filters/CategoryFilters";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleCategoryChange: (category: string) => void;
  handleSubOptionChange: (subOption: string) => void;
  isSearchMode: boolean;
  activeCategory: string;
  activeSubOption: string;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  handleCategoryChange,
  handleSubOptionChange,
  isSearchMode,
  activeCategory,
  activeSubOption,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:fade-in sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-[#CC5500] to-[#A0522D] text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Filter size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Filter Playlists</h2>
              <p className="text-orange-100 text-sm mt-1">
                Choose categories to discover new music
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearchMode ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Filter size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Filters disabled during search
              </h3>
              <p className="text-gray-600 text-sm">
                Clear your search to use category filters
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Browse by Category
                </h3>
                <CategoryFilters
                  handleCategoryChange={handleCategoryChange}
                  handleSubOptionChange={handleSubOptionChange}
                  isSearchMode={isSearchMode}
                  activeCategory={activeCategory}
                  activeSubOption={activeSubOption}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-white text-gray-700 font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#CC5500] to-[#A0522D] text-white font-semibold hover:from-[#B04A00] hover:to-[#8B4513] transition-colors shadow-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};