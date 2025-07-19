import React, { useEffect, useState } from 'react';
import notificationService from '../lib/notificationService';
import toast from 'react-hot-toast';

const NotificationTest: React.FC = () => {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      const success = await notificationService.initialize();
      setIsInitialized(success);
      setDeviceInfo(notificationService.getDeviceInfo());
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const permission = await notificationService.requestPermission();
      setDeviceInfo(notificationService.getDeviceInfo());
      
      if (permission === 'granted') {
        toast.success('Permission granted! You can now receive notifications.');
      } else {
        toast.error('Permission denied. Notifications will not work.');
      }
    } catch (error) {
      toast.error('Failed to request permission.');
    }
  };

  const testNotification = async () => {
    try {
      const success = await notificationService.showTestNotification();
      if (success) {
        toast.success('Test notification sent successfully!');
      } else {
        toast.error('Failed to send test notification.');
      }
    } catch (error) {
      toast.error('Error sending test notification.');
    }
  };

  const testCookNotification = async () => {
    try {
      const success = await notificationService.showCookNotification('TEST-123', 5);
      if (success) {
        toast.success('Cook notification sent successfully!');
      } else {
        toast.error('Failed to send cook notification.');
      }
    } catch (error) {
      toast.error('Error sending cook notification.');
    }
  };

  const testWaiterNotification = async () => {
    try {
      const success = await notificationService.showWaiterNotification('TEST-456', 3);
      if (success) {
        toast.success('Waiter notification sent successfully!');
      } else {
        toast.error('Failed to send waiter notification.');
      }
    } catch (error) {
      toast.error('Error sending waiter notification.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Notification System Test</h1>
        
        {/* Device Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Device Information</h2>
          {deviceInfo ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Notifications Supported:</span>
                <span className={deviceInfo.isSupported ? 'text-green-600' : 'text-red-600'}>
                  {deviceInfo.isSupported ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Permission Status:</span>
                <span className={
                  deviceInfo.permission === 'granted' ? 'text-green-600' : 
                  deviceInfo.permission === 'denied' ? 'text-red-600' : 'text-yellow-600'
                }>
                  {deviceInfo.permission}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Device Type:</span>
                <span className="text-blue-600">
                  {deviceInfo.isMobile ? 'Mobile' : 'Desktop'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Service Worker:</span>
                <span className={deviceInfo.hasServiceWorker ? 'text-green-600' : 'text-red-600'}>
                  {deviceInfo.hasServiceWorker ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Push Manager:</span>
                <span className={deviceInfo.hasPushManager ? 'text-green-600' : 'text-red-600'}>
                  {deviceInfo.hasPushManager ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Loading device information...</p>
          )}
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="space-y-4">
            {/* Permission Request */}
            <div>
              <h3 className="font-medium mb-2">1. Request Permission</h3>
              <button
                onClick={requestPermission}
                disabled={!isInitialized}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Request Notification Permission
              </button>
            </div>

            {/* Test Notifications */}
            <div>
              <h3 className="font-medium mb-2">2. Test Notifications</h3>
              <div className="space-y-2">
                <button
                  onClick={testNotification}
                  disabled={!isInitialized || deviceInfo?.permission !== 'granted'}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mr-2"
                >
                  Test Basic Notification
                </button>
                
                <button
                  onClick={testCookNotification}
                  disabled={!isInitialized || deviceInfo?.permission !== 'granted'}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed mr-2"
                >
                  Test Cook Notification
                </button>
                
                <button
                  onClick={testWaiterNotification}
                  disabled={!isInitialized || deviceInfo?.permission !== 'granted'}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Waiter Notification
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Testing Instructions</h2>
          <div className="space-y-2 text-blue-800">
            <p><strong>1.</strong> Click "Request Notification Permission" to enable notifications</p>
            <p><strong>2.</strong> Once permission is granted, test the different notification types</p>
            <p><strong>3.</strong> On mobile devices, ensure you're using HTTPS</p>
            <p><strong>4.</strong> Check that notifications appear both in the browser and as system notifications</p>
            <p><strong>5.</strong> If notifications don't work, check the browser's notification settings</p>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-yellow-50 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-900">Troubleshooting</h2>
          <div className="space-y-2 text-yellow-800">
            <p><strong>Mobile Issues:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Ensure you're using HTTPS (required for mobile notifications)</li>
              <li>Check browser notification settings in device settings</li>
              <li>Some mobile browsers require a service worker (already implemented)</li>
            </ul>
            <p className="mt-2"><strong>Desktop Issues:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Check browser notification settings</li>
              <li>Ensure the site is not blocked in notification settings</li>
              <li>Try refreshing the page after granting permission</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTest; 