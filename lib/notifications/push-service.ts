/**
 * Push Notification Service
 * Handles device push notifications via Service Worker
 */

export class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker not supported');
      return false;
    }

    if (!('PushManager' in window)) {
      console.error('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered');

      // Request notification permission
      const permission = await this.requestPermission();
      if (!permission) {
        console.error('Notification permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
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
   * Show push notification
   */
  async showNotification(
    title: string,
    options: {
      body: string;
      icon?: string;
      badge?: string;
      tag?: string;
      data?: any;
      requireInteraction?: boolean;
      actions?: Array<{ action: string; title: string; icon?: string }>;
    }
  ): Promise<void> {
    if (!this.registration) {
      // Fallback to browser notification
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      }
      return;
    }

    try {
      const notificationOptions: any = {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag || 'default',
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        vibrate: [200, 100, 200],
      };

      // Add actions if provided
      if (options.actions && options.actions.length > 0) {
        notificationOptions.actions = options.actions;
      }

      await this.registration.showNotification(title, notificationOptions);

      // Vibrate device
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Send notification for leave request
   */
  async notifyLeaveRequest(data: {
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }): Promise<void> {
    await this.showNotification('🏖️ New Leave Request', {
      body: `${data.employeeName} requested ${data.leaveType} leave from ${data.startDate} to ${data.endDate}`,
      tag: 'leave-request',
      requireInteraction: true,
      data: { type: 'leave_request', ...data },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'close', title: 'Dismiss' },
      ],
    });
  }

  /**
   * Send notification for leave approval
   */
  async notifyLeaveApproved(data: {
    leaveType: string;
    startDate: string;
    endDate: string;
  }): Promise<void> {
    await this.showNotification('✅ Leave Approved', {
      body: `Your ${data.leaveType} leave from ${data.startDate} to ${data.endDate} has been approved`,
      tag: 'leave-approved',
      data: { type: 'leave_approved', ...data },
    });
  }

  /**
   * Send notification for leave rejection
   */
  async notifyLeaveRejected(data: {
    leaveType: string;
    startDate: string;
    endDate: string;
  }): Promise<void> {
    await this.showNotification('❌ Leave Rejected', {
      body: `Your ${data.leaveType} leave from ${data.startDate} to ${data.endDate} has been rejected`,
      tag: 'leave-rejected',
      data: { type: 'leave_rejected', ...data },
    });
  }

  /**
   * Send notification for night duty request
   */
  async notifyNightDutyRequest(data: {
    employeeName: string;
    date: string;
  }): Promise<void> {
    await this.showNotification('🌙 New Night Duty Request', {
      body: `${data.employeeName} requested night duty for ${data.date}`,
      tag: 'night-duty-request',
      requireInteraction: true,
      data: { type: 'night_duty_request', ...data },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'close', title: 'Dismiss' },
      ],
    });
  }

  /**
   * Send notification for night duty approval
   */
  async notifyNightDutyApproved(data: { date: string }): Promise<void> {
    await this.showNotification('✅ Night Duty Approved', {
      body: `Your night duty request for ${data.date} has been approved`,
      tag: 'night-duty-approved',
      data: { type: 'night_duty_approved', ...data },
    });
  }

  /**
   * Send notification for night duty rejection
   */
  async notifyNightDutyRejected(data: { date: string }): Promise<void> {
    await this.showNotification('❌ Night Duty Rejected', {
      body: `Your night duty request for ${data.date} has been rejected`,
      tag: 'night-duty-rejected',
      data: { type: 'night_duty_rejected', ...data },
    });
  }

  /**
   * Send notification for geofence alert
   */
  async notifyGeofenceAlert(data: {
    distance: number;
    isUser: boolean;
    employeeName?: string;
  }): Promise<void> {
    if (data.isUser) {
      await this.showNotification('⚠️ Geofence Alert', {
        body: `You are ${data.distance.toFixed(0)}m away from office location!`,
        tag: 'geofence-alert',
        requireInteraction: true,
        data: { type: 'geofence_alert', ...data },
      });
    } else {
      await this.showNotification('⚠️ Employee Left Office Area', {
        body: `${data.employeeName} is ${data.distance.toFixed(0)}m away from office`,
        tag: 'geofence-alert-admin',
        requireInteraction: true,
        data: { type: 'geofence_alert_admin', ...data },
        actions: [
          { action: 'view', title: 'View Location' },
          { action: 'close', title: 'Dismiss' },
        ],
      });
    }
  }

  /**
   * Send notification for attendance modification
   */
  async notifyAttendanceModified(data: {
    date: string;
    modifiedBy: string;
  }): Promise<void> {
    await this.showNotification('📋 Attendance Modified', {
      body: `Your attendance for ${data.date} was modified by ${data.modifiedBy}`,
      tag: 'attendance-modified',
      data: { type: 'attendance_modified', ...data },
    });
  }

  /**
   * Send notification for late arrival
   */
  async notifyLateArrival(data: {
    lateMinutes: number;
    expectedTime: string;
    actualTime: string;
    isAdmin?: boolean;
    employeeName?: string;
  }): Promise<void> {
    if (data.isAdmin) {
      await this.showNotification('⏰ Employee Late Arrival', {
        body: `${data.employeeName} arrived ${data.lateMinutes} minutes late. Expected: ${data.expectedTime}`,
        tag: 'late-arrival-admin',
        requireInteraction: true,
        data: { type: 'late_arrival', ...data },
      });
    } else {
      await this.showNotification('⏰ Late Arrival Alert', {
        body: `You arrived ${data.lateMinutes} minutes late. Expected: ${data.expectedTime}, Actual: ${data.actualTime}`,
        tag: 'late-arrival',
        data: { type: 'late_arrival', ...data },
      });
    }
  }

  /**
   * Send notification for early leave
   */
  async notifyEarlyLeave(data: {
    earlyMinutes: number;
    expectedTime: string;
    actualTime: string;
    isAdmin?: boolean;
    employeeName?: string;
  }): Promise<void> {
    if (data.isAdmin) {
      await this.showNotification('🚪 Employee Early Leave', {
        body: `${data.employeeName} left ${data.earlyMinutes} minutes early. Expected: ${data.expectedTime}`,
        tag: 'early-leave-admin',
        requireInteraction: true,
        data: { type: 'early_leave', ...data },
      });
    } else {
      await this.showNotification('🚪 Early Leave Alert', {
        body: `You left ${data.earlyMinutes} minutes early. Expected: ${data.expectedTime}, Actual: ${data.actualTime}`,
        tag: 'early-leave',
        data: { type: 'early_leave', ...data },
      });
    }
  }

  /**
   * Send system alert
   */
  async notifySystemAlert(data: {
    title: string;
    message: string;
  }): Promise<void> {
    await this.showNotification(data.title, {
      body: data.message,
      tag: 'system-alert',
      requireInteraction: true,
      data: { type: 'system_alert', ...data },
    });
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const pushNotificationService = new PushNotificationService();
