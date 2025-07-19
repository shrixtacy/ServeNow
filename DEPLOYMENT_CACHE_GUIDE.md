# Deployment Cache Management Guide

## Overview

This guide explains the cache busting system implemented to prevent post-deployment loading issues in browsers.

## Cache Busting Features

### 1. Version-Aware Service Worker
- Service worker automatically updates with new versions
- Old caches are cleaned up on activation
- Version-specific cache names prevent conflicts

### 2. Automatic Version Management
- Build process generates unique version numbers
- Version checking on app startup
- Automatic cache clearing for version mismatches

### 3. Cache Control Headers
- Static assets: Long-term caching with immutable flag
- HTML/App files: No-cache to ensure fresh content
- Development: Aggressive no-cache headers

## Deployment Process

### 1. Build with Version Generation
```bash
npm run build
```
This command:
- Generates a unique version number based on timestamp
- Updates `public/version.json` with new version
- Builds the app with cache-busted asset filenames

### 2. Service Worker Version Update
Before each deployment, update the service worker version:
```javascript
// In public/sw.js
const CACHE_VERSION = 'v3'; // Increment this number
```

### 3. Deployment Checklist
- [ ] Run `npm run build`
- [ ] Update service worker version in `public/sw.js`
- [ ] Deploy to production
- [ ] Verify version.json is accessible

## How It Works

### App Startup
1. VersionService checks for version changes
2. Clears stale data if version differs
3. Forces reload if necessary
4. Sets up periodic version checking

### Service Worker
1. Installs with new version
2. Activates and cleans old caches
3. Handles asset caching with version awareness
4. Always fetches fresh HTML content

### Cache Headers
- `/assets/*`: Cached for 1 year (immutable)
- `/*`: No cache (always fresh)
- Development: All requests no-cache

## Troubleshooting

### Manual Cache Clearing
If users experience issues:
1. Open browser dev tools
2. Go to Application tab
3. Clear Storage (localStorage, sessionStorage, IndexedDB)
4. Unregister service worker
5. Reload page

### Debug Mode
Enable debug mode to show cache manager:
```typescript
<CacheManager showDebugInfo={true} />
```

### Force Update
Users can force an update by:
1. Hard refresh (Ctrl+F5 / Cmd+Shift+R)
2. Using the cache manager debug panel
3. Clearing browser cache manually

## Environment Variables

- `VITE_APP_VERSION`: Set automatically during build
- `NODE_ENV`: Set to 'production' for production builds

## Monitoring

Check browser console for:
- `[VersionService]` logs
- `[SW]` service worker logs
- Version mismatch warnings

## Best Practices

1. Always increment service worker version on deployment
2. Test cache clearing in development
3. Monitor for version-related errors
4. Keep version.json accessible
5. Use build script for consistent versioning 