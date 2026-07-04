/**
 * Notification Listener
 * Listens for new notifications and triggers push notifications
 */

import { pushNotificationService } from './push-service';

export class NotificationListener {
  private lastCheckTime: number = Date.now();
  private intervalId: NodeJS.Timeout | null = null;
  private userId: string | null = null;

  /**
   * Start listening for new notifications
   */
  startListening(userId: string): void {
    this.userId = userId;
    this.lastCheckTime = Date.now();

    // Initialize push service
    pushNotificationService.initialize();

    // Check for new notifications every 10 seconds
    this.intervalId = setInterval(() => {
      this.checkForNewNotifications();
    }, 10000);

    console.log('✅ Notification listener started');
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏹️ Notification listener stopped');
  }

  /**
   * Check for new notifications
   */
  private async checkForNewNotifications(): Promise<void> {
    if (!this.userId) return;

    try {
      const response = await fetch(`/api/notifications?userId=${this.userId}&unreadOnly=true`);
      if (!response.ok) return;

      const data = await response.json();
      const notifications = data.notifications || [];

      // Filter notifications created after last check
      const newNotifications = notifications.filter((n: any) => {
        const createdAt = new Date(n.createdAt).getTime();
        return createdAt > this.lastCheckTime;
      });

      // Show push notification for each new notification
      for (const notification of newNotifications) {
        await this.showPushNotification(notification);
      }

      // Update last check time
      if (newNotifications.length > 0) {
        this.lastCheckTime = Date.now();
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }

  /**
   * Show push notification based on type
   */
  private async showPushNotification(notification: any): Promise<void> {
    const type = notification.type;

    switch (type) {
      case 'leave_request':
        await pushNotificationService.notifyLeaveRequest({
          employeeName: notification.data?.employeeName || 'Employee',
          leaveType: notification.data?.leaveType || 'leave',
          startDate: notification.data?.startDate || '',
          endDate: notification.data?.endDate || '',
        });
        break;

      case 'leave_approved':
        await pushNotificationService.notifyLeaveApproved({
          leaveType: notification.data?.leaveType || 'leave',
          startDate: notification.data?.startDate || '',
          endDate: notification.data?.endDate || '',
        });
        break;

      case 'leave_rejected':
        await pushNotificationService.notifyLeaveRejected({
          leaveType: notification.data?.leaveType || 'leave',
          startDate: notification.data?.startDate || '',
          endDate: notification.data?.endDate || '',
        });
        break;

      case 'night_duty_request':
        await pushNotificationService.notifyNightDutyRequest({
          employeeName: notification.data?.employeeName || 'Employee',
          date: notification.data?.date || '',
        });
        break;

      case 'night_duty_approved':
        await pushNotificationService.notifyNightDutyApproved({
          date: notification.data?.date || '',
        });
        break;

      case 'night_duty_rejected':
        await pushNotificationService.notifyNightDutyRejected({
          date: notification.data?.date || '',
        });
        break;

      case 'attendance_modified':
        await pushNotificationService.notifyAttendanceModified({
          date: notification.data?.date || '',
          modifiedBy: notification.data?.modifiedBy || 'Admin',
        });
        break;

      case 'late_arrival':
        await pushNotificationService.notifyLateArrival({
          lateMinutes: notification.data?.lateMinutes || 0,
          expectedTime: notification.data?.expectedTime || '',
          actualTime: notification.data?.actualTime || '',
          isAdmin: notification.data?.employeeName ? true : false,
          employeeName: notification.data?.employeeName,
        });
        break;

      case 'system_alert':
        await pushNotificationService.notifySystemAlert({
          title: notification.title,
          message: notification.message,
        });
        break;

      default:
        // Generic notification
        await pushNotificationService.showNotification(notification.title, {
          body: notification.message,
          data: notification.data,
        });
    }
  }
}

export const notificationListener = new NotificationListener();
