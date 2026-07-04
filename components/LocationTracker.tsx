"use client";

import { useState, useEffect } from 'react';
import { backgroundTracker } from '@/lib/geofencing/background-tracker';

interface LocationTrackerProps {
  userId: string;
  userName: string;
  userRole: 'admin' | 'user';
}

export default function LocationTracker({ userId, userName, userRole }: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Check location permission
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionGranted(result.state === 'granted');
      } catch (error) {
        console.error('Permission check failed:', error);
      }
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission === 'granted');
    }
  };

  const handleStartTracking = async () => {
    // Office location (update with your actual coordinates)
    const officeConfig = {
      latitude: 21.190391,
      longitude: 72.887242,
      radius: 30,
      officeId: 'main-office',
      officeName: 'Main Office',
    };

    const initialized = await backgroundTracker.initialize(officeConfig);

    if (!initialized) {
      alert('❌ Failed to initialize tracking. Please enable location and notification permissions.');
      return;
    }

    backgroundTracker.startTracking(userId, userName);
    setIsTracking(true);
    setPermissionGranted(true);
    setNotificationPermission(true);
  };

  const handleStopTracking = () => {
    backgroundTracker.stopTracking();
    setIsTracking(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">📍</div>
          <div>
            <h3 className="font-semibold text-gray-900">Location Tracking</h3>
            <p className="text-xs text-gray-600">
              {isTracking
                ? '🟢 Active - Monitoring your location'
                : '⚪ Inactive - Click to enable'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!permissionGranted && (
            <span className="text-xs text-orange-600 mr-2">
              ⚠️ Permission needed
            </span>
          )}

          {isTracking ? (
            <button
              onClick={handleStopTracking}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              🛑 Stop Tracking
            </button>
          ) : (
            <button
              onClick={handleStartTracking}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              ▶️ Start Tracking
            </button>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          ℹ️ How it works:
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Tracks your location in background</li>
          <li>• Alerts if you go 50m+ away from office</li>
          <li>• Sends notification to you and admin</li>
          <li>• Works even when app is minimized</li>
          <li>• Requires location & notification permissions</li>
        </ul>
      </div>

      {/* Permission Status */}
      <div className="mt-3 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className={permissionGranted ? 'text-green-600' : 'text-gray-400'}>
            {permissionGranted ? '✅' : '⚪'}
          </span>
          <span className="text-gray-600">Location</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={notificationPermission ? 'text-green-600' : 'text-gray-400'}>
            {notificationPermission ? '✅' : '⚪'}
          </span>
          <span className="text-gray-600">Notifications</span>
        </div>
      </div>
    </div>
  );
}
