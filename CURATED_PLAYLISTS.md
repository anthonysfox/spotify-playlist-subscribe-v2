# Curated Playlists Feature

## Overview

When featured playlists aren't available from Spotify's API, this app provides curated playlists organized by categories to ensure users always have engaging content to discover.

## Categories Available

### 1. **Popular** 🔥

- Top hits 2024
- Viral hits
- Trending now
- Popular songs
- Chart toppers

### 2. **Mood** 😌

- Chill vibes
- Workout motivation
- Party hits
- Study focus
- Sleep relaxation

### 3. **Genre** 🎵

- Pop hits
- Rock classics
- Hip hop essentials
- Electronic dance
- Country favorites

### 4. **Decade** 📅

- 90s hits
- 2000s pop
- 2010s hits
- Classic rock
- Modern hits

### 5. **Activity** 🏃

- Running music
- Cooking playlist
- Commute songs
- Gaming soundtrack
- Travel vibes

## Implementation

### API Endpoint

- **Route**: `/api/spotify/curated-playlists`
- **Method**: GET
- **Parameters**:
  - `category`: The playlist category (popular, mood, genre, decade, activity)
  - `offset`: Pagination offset (default: 0)

### Component

- **File**: `app/components/CuratedPlaylists.tsx`
- **Features**:
  - Category tabs with icons
  - Infinite scroll pagination
  - Duplicate removal
  - Loading states
  - Error handling

## User Experience

1. **Default View**: When users first load the app, they see curated playlists in the "Popular" category
2. **Category Navigation**: Users can switch between categories using the tab interface
3. **Search Integration**: When users search, the curated playlists are replaced with search results
4. **Seamless Transition**: Users can easily switch between search and discovery modes

## Benefits

- **Always Available**: No dependency on Spotify's featured playlists API
- **Broad Appeal**: Categories cover various tastes and preferences
- **Discoverable**: Users can explore different types of content
- **Engaging**: Visual category tabs with icons make navigation intuitive
- **Scalable**: Easy to add new categories or modify search terms

## Technical Details

- Uses Spotify's search API with curated search terms
- Implements concurrent fetching for better performance
- Removes duplicate playlists across search terms
- Supports infinite scroll for better UX
- Maintains consistent styling with the rest of the app
