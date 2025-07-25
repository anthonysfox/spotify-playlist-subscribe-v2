import { categorySubOptions, frontendCategories } from "constants/categories";
import React from "react";

// Use custom categories instead of the default
const categories = frontendCategories.map((cat) =>
  cat.id === "genre" ? { ...cat, name: "Genres", icon: "🎵" } : cat
);

interface CategoryFilterProps {
  isSearchMode: boolean;
  activeCategory: string;
  activeSubOption: string;
  handleCategoryChange: (category: string) => void;
  handleSubOptionChange: (subOption: string) => void;
}
export const CategoryFilters = ({
  isSearchMode,
  activeCategory,
  activeSubOption,
  handleCategoryChange,
  handleSubOptionChange,
}: CategoryFilterProps) => {
  return (
    <>
      {!isSearchMode && (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeCategory === category.id
                  ? "bg-green-100 text-green-700 border-2 border-green-300"
                  : "bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Sub-Options Tabs - Only show when not in search mode */}
      {!isSearchMode &&
        categorySubOptions[
          activeCategory as keyof typeof categorySubOptions
        ] && (
          <div className="flex flex-wrap gap-2">
            {categorySubOptions[
              activeCategory as keyof typeof categorySubOptions
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => handleSubOptionChange(option.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeSubOption === option.id
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                <span className="mr-1">{option.icon}</span>
                {option.name}
              </button>
            ))}
          </div>
        )}
    </>
  );
};
