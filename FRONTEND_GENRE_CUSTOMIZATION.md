# Frontend Genre Customization Guide

## Overview

You can now customize the genres shown on the frontend by modifying the `CuratedPlaylists.tsx` component. This gives you full control over what genres are displayed and how they're organized.

## Current Frontend Genres

The frontend now shows these specific genre categories:

- **Pop** 🎤 - pop hits, top 40, mainstream pop
- **Rock** 🎸 - rock classics, alternative, indie rock
- **Hip Hop** 🎧 - hip hop essentials, rap hits, trap music
- **Electronic** 🎛️ - electronic dance, edm, house music
- **R&B** 🎹 - r&b soul, neo soul, contemporary r&b
- **Country** 🤠 - country favorites, folk music, bluegrass
- **Jazz** 🎷 - jazz vibes, smooth jazz, blues music
- **Classical** 🎻 - classical music, orchestral, piano music

## How to Customize Frontend Genres

### 1. **Change Genre Categories**

Edit the `customGenreCategories` array in `app/components/CuratedPlaylists.tsx`:

```typescript
const customGenreCategories = [
  { id: "pop", name: "Pop", icon: "🎤" },
  { id: "rock", name: "Rock", icon: "🎸" },
  // Add or modify genres here
  { id: "kpop", name: "K-Pop", icon: "🌟" },
  { id: "latin", name: "Latin", icon: "💃" },
];
```

### 2. **Change Genre Names & Icons**

You can customize the display name and icon for each genre:

```typescript
{ id: "pop", name: "Pop Music", icon: "🎵" },
{ id: "rock", name: "Rock & Roll", icon: "🤘" },
```

### 3. **Add New Genres**

To add a new genre, you need to:

1. **Add to frontend** (`CuratedPlaylists.tsx`):

```typescript
{ id: "reggae", name: "Reggae", icon: "🌴" },
```

2. **Add to backend** (`curated-playlists/route.ts`):

```typescript
reggae: [
  "reggae beats",
  "reggae classics",
  "dancehall",
  "ska music",
  "roots reggae"
],
```

## Example Customizations

### **For a K-Pop Focused App**

```typescript
const customGenreCategories = [
  { id: "kpop", name: "K-Pop", icon: "🌟" },
  { id: "khiphop", name: "K-Hip Hop", icon: "🎧" },
  { id: "kballad", name: "K-Ballad", icon: "🎤" },
  { id: "kdance", name: "K-Dance", icon: "💃" },
  { id: "krock", name: "K-Rock", icon: "🎸" },
];
```

### **For a Latin Music App**

```typescript
const customGenreCategories = [
  { id: "reggaeton", name: "Reggaeton", icon: "🔥" },
  { id: "salsa", name: "Salsa", icon: "💃" },
  { id: "bachata", name: "Bachata", icon: "🌹" },
  { id: "merengue", name: "Merengue", icon: "🎺" },
  { id: "latinpop", name: "Latin Pop", icon: "🎤" },
];
```

### **For a Rock-Heavy App**

```typescript
const customGenreCategories = [
  { id: "classicrock", name: "Classic Rock", icon: "🎸" },
  { id: "alternativerock", name: "Alternative", icon: "🎵" },
  { id: "indierock", name: "Indie Rock", icon: "🎤" },
  { id: "hardrock", name: "Hard Rock", icon: "🤘" },
  { id: "punkrock", name: "Punk Rock", icon: "⚡" },
];
```

## Backend Configuration

Remember to add corresponding backend categories in `app/api/spotify/curated-playlists/route.ts`:

```typescript
kpop: [
  "k-pop hits",
  "k-pop girl groups",
  "k-pop boy bands",
  "k-pop solo artists",
  "k-pop bts"
],
```

## Tips for Customization

1. **Keep IDs Simple**: Use lowercase, no spaces (e.g., "hiphop" not "hip hop")
2. **Choose Descriptive Icons**: Use emojis that clearly represent the genre
3. **Limit Categories**: 5-8 genres work best for good UX
4. **Test Search Terms**: Make sure your backend search terms return good results
5. **Consider Your Audience**: Choose genres your users will actually use

## Advanced Customization

### **Change Default Genre**

To change which genre is selected by default:

```typescript
const [activeGenre, setActiveGenre] = useState("rock"); // Change from "pop" to "rock"
```

### **Add Genre Descriptions**

You can add descriptions for each genre:

```typescript
const customGenreCategories = [
  { id: "pop", name: "Pop", icon: "🎤", description: "Mainstream pop hits" },
  {
    id: "rock",
    name: "Rock",
    icon: "🎸",
    description: "Classic and modern rock",
  },
];
```

### **Conditional Genre Display**

Show different genres based on user preferences:

```typescript
const userPreferredGenres = ["pop", "rock", "electronic"];
const filteredGenres = customGenreCategories.filter((genre) =>
  userPreferredGenres.includes(genre.id)
);
```

This gives you complete control over the genre experience on your frontend!
