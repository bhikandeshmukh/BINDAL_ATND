/**
 * Background Geolocation Tracking
 * Tracks user location even when app is in background
 */

import { pushNotificationService } from '../notifications/push-service';

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  officeId: string;
  officeName: string;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
}

class BackgroundTracker {
  private watchId: number | null = null;
  private geofenceConfig: GeofenceConfig | null = null;
  private isTracking: boolean = false;
  private lastNotificationTime: number = 0;
  private notificationCooldown: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize background tracking
   */
  async initialize(config: GeofenceConfig): Promise<boolean> {
    this.geofenceConfig = config;

    // Check if geolocation is supported
    if (!('geolocation' in navigator)) {
      console.error('Geolocation not supported');
      return false;
    }

    // Request permission
    const permission = await this.requestPermission();
    if (!permission) {
      console.error('Location permission denied');
      return false;
    }

    // Request notification permission
    await this.requestNotificationPermission();

    return true;
  }

  /**
   * Request location permission
   */
  private async requestPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state === 'granted' || result.state === 'prompt';
    } catch (error) {
      console.error('Permission check failed:', error);
      return true; // Fallback to trying anyway
    }
  }

  /**
   * Request notification permission
   */
  private async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.error('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Start tracking
   */
  startTracking(userId: string, userName: string): void {
    if (this.isTracking) {
      console.log('Already tracking');
      return;
    }

    if (!this.geofenceConfig) {
      console.error('Geofence config not set');
      return;
    }

    this.isTracking = true;

    // High accuracy tracking
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position, userId, userName),
      (error) => this.handleLocationError(error),
      options
    );

    console.log('✅ Background tracking started');
  }

  /**
   * Stop tracking
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    console.log('⏹️ Background tracking stopped');
  }

  /**
   * Handle location update
   */
  private async handleLocationUpdate(
    position: GeolocationPosition,
    userId: string,
    userName: string
  ): Promise<void> {
    if (!this.geofenceConfig) return;

    const currentLocation: LocationUpdate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy,
    };

    // Calculate distance from office
    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      this.geofenceConfig.latitude,
      this.geofenceConfig.longitude
    );

    console.log(`📍 Distance from office: ${distance.toFixed(2)}m`);

    // Check if user is outside geofence (50m)
    if (distance > 50) {
      await this.handleGeofenceExit(userId, userName, distance, currentLocation);
    }

    // Send location update to server
    await this.sendLocationUpdate(userId, currentLocation, distance);
  }

  /**
   * Handle geofence exit
   */
  private async handleGeofenceExit(
    userId: string,
    userName: string,
    distance: number,
    location: LocationUpdate
  ): Promise<void> {
    const now = Date.now();

    // Check cooldown to avoid spam
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return;
    }

    this.lastNotificationTime = now;

    // Show local notification
    this.showNotification(
      '⚠️ Geofence Alert',
      `You are ${distance.toFixed(0)}m away from office location!`
    );

    // Send alert to server
    await this.sendGeofenceAlert(userId, userName, distance, location);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Show browser notification (using push service)
   */
  private async showNotification(title: string, body: string): Promise<void> {
    await pushNotificationService.showNotification(title, {
      body,
      tag: 'geofence-alert',
      requireInteraction: true,
      data: { type: 'geofence_alert' },
    });
  }

  /**
   * Send location update to server
   */
  private async sendLocationUpdate(
    userId: string,
    location: LocationUpdate,
    distance: number
  ): Promise<void> {
    try {
      await fetch('/api/tracking/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          distance,
          timestamp: location.timestamp,
        }),
      });
    } catch (error) {
      console.error('Failed to send location update:', error);
    }
  }

  /**
   * Send geofence alert to server
   */
  private async sendGeofenceAlert(
    userId: string,
    userName: string,
    distance: number,
    location: LocationUpdate
  ): Promise<void> {
    try {
      await fetch('/api/tracking/geofence-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName,
          distance,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp,
        }),
      });
    } catch (error) {
      console.error('Failed to send geofence alert:', error);
    }
  }

  /**
   * Handle location error
   */
  private handleLocationError(error: GeolocationPositionError): void {
    console.error('Location error:', error.message);
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.showNotification(
          '❌ Location Permission Denied',
          'Please enable location access to use tracking'
        );
        this.stopTracking();
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('Location unavailable');
        break;
      case error.TIMEOUT:
        console.error('Location timeout');
        break;
    }
  }

  /**
   * Get tracking status
   */
  isActive(): boolean {
    return this.isTracking;
  }
}

export const backgroundTracker = new BackgroundTracker();
