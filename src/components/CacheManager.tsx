import React, { useEffect, useState } from 'react';
import { VersionService } from '../lib/versionService';

interface CacheManagerProps {
  showDebugInfo?: boolean;
}

export const CacheManager: React.FC<CacheManagerProps> = ({ showDebugInfo = false }) => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setCurrentVersion(VersionService.getCurrentVersion());
  }, []);

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached data? This will log you out and reload the app.')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/version.json', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLastCheck(new Date());
        
        if (data.version !== currentVersion) {
          if (confirm(`New version available: ${data.version}. Current: ${currentVersion}. Reload to update?`)) {
            window.location.reload();
          }
        } else {
          alert('You are running the latest version!');
        }
      }
    } catch (error) {
      alert('Failed to check for updates. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  if (!showDebugInfo) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
      <h3 className="text-sm font-semibold mb-2">Cache Manager</h3>
      <div className="space-y-2 text-xs">
        <div>
          <strong>Current Version:</strong> {currentVersion}
        </div>
        {lastCheck && (
          <div>
            <strong>Last Check:</strong> {lastCheck.toLocaleTimeString()}
          </div>
        )}
        <div className="flex space-x-2">
          <button
            onClick={handleCheckForUpdates}
            disabled={isChecking}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Check Updates'}
          </button>
          <button
            onClick={handleClearCache}
            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}; 