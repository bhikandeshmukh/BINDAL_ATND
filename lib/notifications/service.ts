/**
 * Notification Service - Firebase Wrapper
 * This file provides backward compatibility with existing code
 */

import {
  createNotification as createFirebaseNotification,
  getUserNotifications as getFirebaseUserNotifications,
  markNotificationAsRead as markFirebaseNotificationAsRead,
  markAllAsRead as markFirebaseAllAsRead,
  deleteOldNotifications as deleteFirebaseOldNotifications,
  getUnreadCount as getFirebaseUnreadCount,
  NotificationType,
  Notification,
} from '../firebase/notifications';

// Re-export types for backward compatibility
export { NotificationType };
export type { Notification };

/**
 * Create a new notification (Firebase wrapper for backward compatibility)
 */
export async function createNotification(
    notification: Omit<Notification, "id" | "createdAt" | "isRead">
): Promise<string> {
    // SpreadsheetId is ignored, kept for backward compatibility
    return await createFirebaseNotification(notification);
}

/**
 * Get notifications for a user (Firebase wrapper)
 */
export async function getUserNotifications(
    userId: string,
    unreadOnly: boolean = false
): Promise<Notification[]> {
    const notifications = await getFirebaseUserNotifications(userId, unreadOnly);
    
    // Return as-is since Notification interface uses Date type
    return notifications;
}

/**
 * Mark notification as read (Firebase wrapper)
 */
export async function markNotificationAsRead(
    userId: string,
    notificationId: string
): Promise<void> {
    await markFirebaseNotificationAsRead(userId, notificationId);
}

/**
 * Mark all notifications as read for a user (Firebase wrapper)
 */
export async function markAllAsRead(
    userId: string
): Promise<number> {
    return await markFirebaseAllAsRead(userId);
}

/**
 * Delete old notifications (Firebase wrapper)
 */
export async function deleteOldNotifications(
    userId: string,
    daysOld: number = 30
): Promise<number> {
    return await deleteFirebaseOldNotifications(userId, daysOld);
}

/**
 * Get unread notification count for a user (Firebase wrapper)
 */
export async function getUnreadCount(
    userId: string
): Promise<number> {
    return await getFirebaseUnreadCount(userId);
}
