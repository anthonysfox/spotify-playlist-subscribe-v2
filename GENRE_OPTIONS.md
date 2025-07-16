# Genre Options for Curated Playlists

## Current Genres (in use)

- pop hits
- rock classics
- hip hop essentials
- electronic dance
- indie alternative
- r&b soul
- country favorites
- jazz vibes
- classical music
- reggae beats

## Alternative Genre Options

### **Pop & Mainstream**

- pop hits
- top 40 hits
- mainstream pop
- pop classics
- chart pop
- radio hits

### **Rock & Alternative**

- rock classics
- alternative rock
- indie rock
- classic rock
- hard rock
- punk rock
- grunge
- metal music

### **Hip Hop & Rap**

- hip hop essentials
- rap hits
- trap music
- old school hip hop
- modern rap
- underground hip hop

### **Electronic & Dance**

- electronic dance
- edm hits
- house music
- techno beats
- trance music
- dubstep
- ambient electronic

### **R&B & Soul**

- r&b soul
- neo soul
- classic soul
- contemporary r&b
- smooth r&b
- gospel music

### **Country & Folk**

- country favorites
- country hits
- folk music
- bluegrass
- country rock
- acoustic folk

### **Jazz & Blues**

- jazz vibes
- smooth jazz
- blues music
- jazz classics
- fusion jazz
- bebop

### **Classical & Instrumental**

- classical music
- orchestral
- piano music
- instrumental
- film scores
- opera

### **World & International**

- reggae beats
- latin music
- african music
- asian pop
- world music
- caribbean vibes

### **Niche Genres**

- k-pop hits
- j-pop
- bollywood
- reggaeton
- salsa music
- flamenco
- celtic music
- irish folk

## How to Change Genres

To modify the genres, edit the `genre` array in `app/api/spotify/curated-playlists/route.ts`:

```typescript
genre: [
  "your genre 1",
  "your genre 2",
  "your genre 3",
  // ... add more genres
],
```

## Tips for Choosing Genres

1. **Mix Popular & Niche**: Combine mainstream genres with more specific ones
2. **Consider Your Audience**: Choose genres that appeal to your target users
3. **Test Performance**: Some search terms may return better results than others
4. **Keep it Balanced**: Don't overload with too many genres (5-10 is ideal)
5. **Use Descriptive Terms**: "hip hop essentials" works better than just "hip hop"

## Example Customizations

### **For a Rock-Heavy App**

```typescript
genre: [
  "rock classics",
  "alternative rock",
  "indie rock",
  "classic rock",
  "hard rock",
  "punk rock",
];
```

### **For a Pop-Focused App**

```typescript
genre: ["pop hits", "top 40 hits", "mainstream pop", "chart pop", "radio hits"];
```

### **For a Diverse Music App**

```typescript
genre: [
  "pop hits",
  "rock classics",
  "hip hop essentials",
  "electronic dance",
  "r&b soul",
  "country favorites",
  "jazz vibes",
  "classical music",
];
```
