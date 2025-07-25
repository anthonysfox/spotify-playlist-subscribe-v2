// Frontend configuration - you can customize these categories
export const frontendCategories = [
  { id: "popular", name: "Popular", icon: "🔥" },
  { id: "mood", name: "Mood", icon: "😌" },
  { id: "genre", name: "Genre", icon: "🎵" },
  { id: "decade", name: "Decade", icon: "📅" },
  { id: "activity", name: "Activity", icon: "🏃" },
];

// Sub-options for each main category
export const categorySubOptions = {
  popular: [
    { id: "trending", name: "Trending", icon: "📈" },
    { id: "viral", name: "Viral", icon: "🦠" },
    { id: "charts", name: "Charts", icon: "📊" },
    { id: "hits", name: "Hits", icon: "🎯" },
    { id: "top40", name: "Top 40", icon: "🏆" },
  ],
  mood: [
    { id: "chill", name: "Chill", icon: "😌" },
    { id: "energetic", name: "Energetic", icon: "⚡" },
    { id: "romantic", icon: "💕", name: "Romantic" },
    { id: "melancholy", name: "Melancholy", icon: "🌧️" },
    { id: "happy", name: "Happy", icon: "😊" },
    { id: "focused", name: "Focused", icon: "🎯" },
  ],
  genre: [
    { id: "pop", name: "Pop", icon: "🎤" },
    { id: "rock", name: "Rock", icon: "🎸" },
    { id: "hiphop", name: "Hip Hop", icon: "🎧" },
    { id: "electronic", name: "Electronic", icon: "🎛️" },
    { id: "r&b", name: "R&B", icon: "🎹" },
    { id: "country", name: "Country", icon: "🤠" },
    { id: "jazz", name: "Jazz", icon: "🎷" },
    { id: "classical", name: "Classical", icon: "🎻" },
  ],
  decade: [
    { id: "2020s", name: "2020s", icon: "📱" },
    { id: "2010s", name: "2010s", icon: "📱" },
    { id: "2000s", name: "2000s", icon: "💿" },
    { id: "1990s", name: "1990s", icon: "📼" },
    { id: "1980s", name: "1980s", icon: "📻" },
    { id: "1970s", name: "1970s", icon: "🎸" },
    { id: "1960s", name: "1960s", icon: "🌺" },
  ],
  activity: [
    { id: "workout", name: "Workout", icon: "💪" },
    { id: "running", name: "Running", icon: "🏃" },
    { id: "cooking", name: "Cooking", icon: "👨‍🍳" },
    { id: "commute", name: "Commute", icon: "🚗" },
    { id: "gaming", name: "Gaming", icon: "🎮" },
    { id: "travel", name: "Travel", icon: "✈️" },
    { id: "study", name: "Study", icon: "📚" },
    { id: "party", name: "Party", icon: "🎉" },
  ],
};
