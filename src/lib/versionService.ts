// Version management service for cache invalidation
export class VersionService {
  private static readonly VERSION_KEY = 'servenow_app_version';
  private static readonly STORAGE_VERSION_KEY = 'servenow_storage_version';
  private static readonly CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || Date.now().toString();
  private static readonly IS_DEV = import.meta.env.DEV;

  /**
   * Get current app version
   */
  static getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * Check if app version has changed and clear stale data
   */
  static checkVersionAndClearStaleData(): boolean {
    // Skip version checking in development mode
    if (this.IS_DEV) {
      console.log('[VersionService] Development mode - skipping version checks');
      return false;
    }

    const storedVersion = localStorage.getItem(this.VERSION_KEY);
    const storageVersion = localStorage.getItem(this.STORAGE_VERSION_KEY);
    
    // If version changed, clear all cached data
    if (storedVersion !== this.CURRENT_VERSION) {
      console.log('[VersionService] App version changed, clearing cache');
      this.clearAllCachedData();
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
      return true;
    }

    // If storage version is different, clear localStorage
    if (storageVersion !== this.CURRENT_VERSION) {
      console.log('[VersionService] Storage version changed, clearing localStorage');
      this.clearLocalStorage();
      localStorage.setItem(this.STORAGE_VERSION_KEY, this.CURRENT_VERSION);
      return true;
    }

    return false;
  }

  /**
   * Clear all cached data
   */
  private static clearAllCachedData(): void {
    // Clear localStorage
    this.clearLocalStorage();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB if available
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
  }

  /**
   * Clear localStorage while preserving essential data
   */
  private static clearLocalStorage(): void {
    const keysToPreserve = [
      'supabase.auth.token', // Preserve auth tokens
      'supabase.auth.refreshToken'
    ];
    
    const preservedData: Record<string, string> = {};
    
    // Save data to preserve
    keysToPreserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        preservedData[key] = value;
      }
    });
    
    // Clear all localStorage
    localStorage.clear();
    
    // Restore preserved data
    Object.entries(preservedData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }

  /**
   * Force reload the application
   */
  static forceReload(): void {
    console.log('[VersionService] Forcing app reload');
    window.location.reload();
  }

  /**
   * Initialize version checking
   */
  static init(): void {
    // Skip initialization in development mode
    if (this.IS_DEV) {
      console.log('[VersionService] Development mode - skipping initialization');
      return;
    }

    // Check version on app start
    const versionChanged = this.checkVersionAndClearStaleData();
    
    if (versionChanged) {
      // Force reload if version changed
      this.forceReload();
    }

    // Set up periodic version checking (every 5 minutes) - only in production
    setInterval(() => {
      this.checkVersionPeriodically();
    }, 5 * 60 * 1000);
  }

  /**
   * Periodic version check
   */
  private static async checkVersionPeriodically(): Promise<void> {
    // Skip periodic checks in development
    if (this.IS_DEV) {
      return;
    }

    try {
      // Fetch current version from server
      const response = await fetch('/version.json', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        const serverVersion = data.version;
        
        if (serverVersion && serverVersion !== this.CURRENT_VERSION) {
          console.log('[VersionService] Server version differs, updating app');
          this.forceReload();
        }
      }
    } catch (error) {
      // Silently fail - this is just a periodic check
      console.debug('[VersionService] Version check failed:', error);
    }
  }
} 