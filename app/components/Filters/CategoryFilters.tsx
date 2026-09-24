import { categorySubOptions, frontendCategories } from "constants/categories";
import React from "react";

// Slightly friendlier plural labels; ids stay as the API expects them.
const RELABEL: Record<string, string> = {
  mood: "Moods",
  genre: "Genres",
  decade: "Decades",
  activity: "Activities",
};

const categories = frontendCategories.map((cat) => ({
  ...cat,
  name: RELABEL[cat.id] ?? cat.name,
}));

interface CategoryFilterProps {
  isSearchMode: boolean;
  activeCategory: string;
  activeSubOption: string;
  handleCategoryChange: (category: string) => void;
  handleSubOptionChange: (subOption: string) => void;
}

/**
 * Inline filter chips (README "Discover", artboard 1b) — replaces the old
 * FilterModal. Primary row selects the category (active = solid ink); a
 * hairline divider; then the sub-option row (active = brand tint).
 */
export const CategoryFilters = ({
  isSearchMode,
  activeCategory,
  activeSubOption,
  handleCategoryChange,
  handleSubOptionChange,
}: CategoryFilterProps) => {
  if (isSearchMode) return null;

  const subOptions =
    categorySubOptions[activeCategory as keyof typeof categorySubOptions];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const active = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                active
                  ? "bg-ink text-surface"
                  : "border-line bg-surface text-ink-50 hover:text-ink-70 border"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {subOptions && (
        <div className="border-line flex flex-wrap gap-2 border-t pt-3">
          {subOptions.map((option) => {
            const active = activeSubOption === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSubOptionChange(option.id)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-brand-tint text-brand-deep"
                    : "bg-ground-alt text-ink-50 hover:text-ink-70"
                }`}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
