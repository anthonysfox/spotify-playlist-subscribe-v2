# Sub-Options System Guide

## Overview

All main category tabs now have sub-options that provide more granular control over playlist discovery. This gives users specific choices within each category instead of generic categories.

## Current Sub-Options by Category

### **🔥 Popular**

- **Trending** 📈 - trending now, viral hits, trending songs
- **Viral** 🦠 - viral hits, viral songs, viral tiktok
- **Charts** 📊 - chart toppers, billboard hits, top charts
- **Hits** 🎯 - top hits, hit songs, popular hits
- **Top 40** 🏆 - top 40 hits, top 40 songs, top 40 radio

### **😌 Mood**

- **Chill** 😌 - chill vibes, chill music, chill songs
- **Energetic** ⚡ - energetic music, high energy, energy boost
- **Romantic** 💕 - romantic songs, love songs, romantic vibes
- **Melancholy** 🌧️ - melancholy music, sad songs, emotional music
- **Happy** 😊 - happy songs, feel good songs, happy vibes
- **Focused** 🎯 - focus music, study focus, concentration music

### **🎵 Genres**

- **Pop** 🎤 - pop hits, top 40 hits, mainstream pop
- **Rock** 🎸 - rock classics, alternative rock, indie rock
- **Hip Hop** 🎧 - hip hop essentials, rap hits, trap music
- **Electronic** 🎛️ - electronic dance, edm hits, house music
- **R&B** 🎹 - r&b soul, neo soul, contemporary r&b
- **Country** 🤠 - country favorites, folk music, bluegrass
- **Jazz** 🎷 - jazz vibes, smooth jazz, blues music
- **Classical** 🎻 - classical music, orchestral, piano music

### **📅 Decade**

- **2020s** 📱 - 2020s hits, modern hits, 2020s playlist
- **2010s** 📱 - 2010s hits, 2010s pop, 2010s playlist
- **2000s** 💿 - 2000s hits, 2000s pop, 2000s playlist
- **1990s** 📼 - 90s hits, 90s classics, 90s playlist
- **1980s** 📻 - 80s hits, 80s classics, 80s playlist
- **1970s** 🎸 - 70s hits, 70s classics, 70s playlist
- **1960s** 🌺 - 60s hits, 60s classics, 60s playlist

### **🏃 Activity**

- **Workout** 💪 - workout motivation, gym playlist, fitness music
- **Running** 🏃 - running music, jogging music, cardio music
- **Cooking** 👨‍🍳 - cooking playlist, kitchen vibes, chef music
- **Commute** 🚗 - commute songs, driving playlist, road trip music
- **Gaming** 🎮 - gaming soundtrack, video game music, game music
- **Travel** ✈️ - travel vibes, vacation music, travel songs
- **Study** 📚 - study focus, academic music, study songs
- **Party** 🎉 - party hits, celebration music, party songs

## How to Customize Sub-Options

### **1. Modify Frontend Sub-Options**

Edit the `categorySubOptions` object in `app/components/CuratedPlaylists.tsx`:

```typescript
const categorySubOptions = {
  popular: [
    { id: "trending", name: "Trending", icon: "📈" },
    { id: "viral", name: "Viral", icon: "🦠" },
    // Add or modify sub-options here
    { id: "new", name: "New Releases", icon: "🆕" },
  ],
  // ... other categories
};
```

### **2. Add Backend Support**

Add corresponding backend categories in `app/api/spotify/curated-playlists/route.ts`:

```typescript
new: [
  "new releases",
  "new music",
  "new songs",
  "latest hits",
  "fresh music"
],
```

## Example Customizations

### **For a Fitness-Focused App**

```typescript
const categorySubOptions = {
  activity: [
    { id: "workout", name: "Workout", icon: "💪" },
    { id: "running", name: "Running", icon: "🏃" },
    { id: "yoga", name: "Yoga", icon: "🧘" },
    { id: "cycling", name: "Cycling", icon: "🚴" },
    { id: "swimming", name: "Swimming", icon: "🏊" },
  ],
};
```

### **For a Study-Focused App**

```typescript
const categorySubOptions = {
  mood: [
    { id: "focused", name: "Focused", icon: "🎯" },
    { id: "calm", name: "Calm", icon: "😌" },
    { id: "productive", name: "Productive", icon: "📈" },
    { id: "creative", name: "Creative", icon: "🎨" },
  ],
};
```

### **For a Party App**

```typescript
const categorySubOptions = {
  mood: [
    { id: "party", name: "Party", icon: "🎉" },
    { id: "energetic", name: "Energetic", icon: "⚡" },
    { id: "dance", name: "Dance", icon: "💃" },
    { id: "celebration", name: "Celebration", icon: "🎊" },
  ],
};
```

## Advanced Customization

### **Change Default Sub-Option**

```typescript
const [activeSubOption, setActiveSubOption] = useState("viral"); // Instead of "trending"
```

### **Add Category Descriptions**

```typescript
const categorySubOptions = {
  popular: [
    {
      id: "trending",
      name: "Trending",
      icon: "📈",
      description: "What's hot right now",
    },
    {
      id: "viral",
      name: "Viral",
      icon: "🦠",
      description: "Going viral on social media",
    },
  ],
};
```

### **Conditional Sub-Options**

Show different sub-options based on user preferences:

```typescript
const userPreferences = {
  favoriteMood: "energetic",
  favoriteActivity: "workout",
};

const getFilteredSubOptions = (category: string) => {
  const options = categorySubOptions[category];
  if (category === "mood" && userPreferences.favoriteMood) {
    return options.filter(
      (option) => option.id === userPreferences.favoriteMood
    );
  }
  return options;
};
```

## User Experience Benefits

1. **More Specific Discovery**: Users can find exactly what they're looking for
2. **Better Organization**: Clear categorization makes navigation intuitive
3. **Reduced Overwhelm**: Smaller, focused choices instead of broad categories
4. **Personalized Experience**: Users can quickly access their preferred types
5. **Visual Clarity**: Icons and specific names make options easy to understand

## Technical Implementation

- **Frontend**: Sub-options are managed in `CuratedPlaylists.tsx`
- **Backend**: Each sub-option has corresponding search terms in the API
- **State Management**: Active sub-option is tracked separately from main category
- **API Integration**: Sub-option ID is passed directly to the API endpoint
- **Responsive Design**: Sub-options wrap and adapt to screen size

This system provides a much richer and more personalized playlist discovery experience!
