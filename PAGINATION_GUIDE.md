# Pagination Guide for CuratedPlaylists

## Overview

The CuratedPlaylists component now supports both **pagination** and **infinite scroll** modes, giving users flexibility in how they browse through playlists.

## Features

### **📄 Pagination Mode**

- **Page Numbers**: Click on specific page numbers to jump directly
- **Navigation Buttons**: First, Previous, Next, and Last page buttons
- **Page Counter**: Shows current page and total pages
- **Smart Page Display**: Shows up to 5 page numbers at a time
- **Loading States**: Buttons are disabled during loading

### **♾️ Infinite Scroll Mode**

- **Auto-loading**: Automatically loads more playlists when scrolling to bottom
- **Seamless Experience**: No interruption to browsing flow
- **Memory Efficient**: Loads content on-demand

### **🔄 Toggle Between Modes**

- **View Mode Toggle**: Switch between "Pages" and "Infinite Scroll"
- **Persistent Choice**: Mode preference is maintained during session
- **Instant Switching**: No data loss when switching modes

## User Interface

### **Pagination Controls**

```
[<<] [<] [1] [2] [3] [4] [5] [>] [>>]  Page 3 of 10
```

- **<<** - Go to first page
- **<** - Go to previous page
- **[1] [2] [3]** - Click specific page numbers
- **>** - Go to next page
- **>>** - Go to last page
- **Page X of Y** - Current page indicator

### **View Mode Toggle**

```
View mode: [Pages] [Infinite Scroll]
```

## Technical Implementation

### **State Management**

```typescript
// Pagination state
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [usePagination, setUsePagination] = useState(true);
const itemsPerPage = 20;
```

### **API Integration**

```typescript
// Calculate offset based on mode
const currentOffset = usePagination
  ? (page - 1) * itemsPerPage
  : reset
  ? 0
  : offset;

// Fetch with appropriate parameters
const res = await fetch(
  `/api/spotify/curated-playlists?category=${apiCategory}&offset=${currentOffset}`
);
```

### **Page Number Generation**

```typescript
const getPageNumbers = () => {
  const pages = [];
  const maxVisiblePages = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return pages;
};
```

## Customization Options

### **Change Items Per Page**

```typescript
const itemsPerPage = 30; // Change from 20 to 30
```

### **Change Default Mode**

```typescript
const [usePagination, setUsePagination] = useState(false); // Default to infinite scroll
```

### **Customize Page Display**

```typescript
const maxVisiblePages = 7; // Show more page numbers
```

### **Add Page Size Selector**

```typescript
const [itemsPerPage, setItemsPerPage] = useState(20);

// Add to UI
<select
  value={itemsPerPage}
  onChange={(e) => setItemsPerPage(Number(e.target.value))}
>
  <option value={10}>10 per page</option>
  <option value={20}>20 per page</option>
  <option value={50}>50 per page</option>
</select>;
```

## Advanced Features

### **URL State Management**

```typescript
// Sync pagination state with URL
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get("page");
  if (page) {
    setCurrentPage(Number(page));
  }
}, []);

// Update URL when page changes
useEffect(() => {
  const url = new URL(window.location);
  url.searchParams.set("page", currentPage.toString());
  window.history.pushState({}, "", url);
}, [currentPage]);
```

### **Keyboard Navigation**

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handlePageChange(currentPage - 1);
    } else if (e.key === "ArrowRight") {
      handlePageChange(currentPage + 1);
    }
  };

  document.addEventListener("keydown", handleKeyPress);
  return () => document.removeEventListener("keydown", handleKeyPress);
}, [currentPage]);
```

### **Loading Indicators**

```typescript
// Add loading spinner to pagination controls
{
  loading && (
    <div className="flex items-center gap-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
      <span className="text-sm text-gray-600">Loading...</span>
    </div>
  );
}
```

## Performance Considerations

### **Debounced Page Changes**

```typescript
const debouncedPageChange = useCallback(
  debounce((page: number) => {
    handlePageChange(page);
  }, 300),
  []
);
```

### **Caching**

```typescript
// Cache playlist data by page
const [playlistCache, setPlaylistCache] = useState<
  Record<number, ISpotifyPlaylist[]>
>({});

// Check cache before fetching
if (playlistCache[page]) {
  setPlaylists(playlistCache[page]);
  return;
}
```

## Accessibility Features

### **ARIA Labels**

```typescript
<button
  aria-label={`Go to page ${page}`}
  aria-current={currentPage === page ? "page" : undefined}
>
  {page}
</button>
```

### **Screen Reader Support**

```typescript
<span className="sr-only">
  Page {currentPage} of {totalPages} playlists
</span>
```

## Best Practices

1. **Consistent Page Size**: Keep items per page consistent across the app
2. **Loading States**: Always show loading indicators during page changes
3. **Error Handling**: Handle API errors gracefully
4. **Mobile Responsive**: Ensure pagination works well on mobile devices
5. **Keyboard Navigation**: Support keyboard shortcuts for power users
6. **URL Sync**: Consider syncing pagination state with URL for bookmarking

## Troubleshooting

### **Common Issues**

1. **Page Numbers Not Updating**: Check if `totalPages` is being set correctly
2. **Infinite Scroll Not Working**: Ensure `usePagination` is false and scroll events are attached
3. **Loading States Not Showing**: Verify loading state is being set during API calls
4. **Page Jumping**: Check if page calculations are correct

### **Debug Mode**

```typescript
const DEBUG = true;

if (DEBUG) {
  console.log("Current Page:", currentPage);
  console.log("Total Pages:", totalPages);
  console.log("Use Pagination:", usePagination);
}
```

This pagination system provides a robust and user-friendly way to navigate through large collections of playlists!
