/**
 * Firebase Firestore - Notifications Operations
 */

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    deleteDoc,
    setDoc,
    writeBatch,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Notification types
 */
export enum NotificationType {
    LEAVE_REQUEST = 'leave_request',
    LEAVE_APPROVED = 'leave_approved',
    LEAVE_REJECTED = 'leave_rejected',
    NIGHT_DUTY_REQUEST = 'night_duty_request',
    NIGHT_DUTY_APPROVED = 'night_duty_approved',
    NIGHT_DUTY_REJECTED = 'night_duty_rejected',
    ATTENDANCE_MODIFIED = 'attendance_modified',
    LATE_ARRIVAL = 'late_arrival',
    PASSWORD_RESET = 'password_reset',
    SYSTEM_ALERT = 'system_alert',
}

/**
 * Notification interface
 */
export interface Notification {
    id?: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    isRead: boolean;
    createdAt?: Date;
    readAt?: Date;
}

/**
 * Create a new notification (user-wise structure)
 */
export async function createNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
): Promise<string> {
    try {
        const { userId, ...notificationData } = notification;

        // Create/update user document in notifications collection
        await setDoc(doc(db, 'notifications', userId), {
            userId: userId,
            lastUpdated: Timestamp.now(),
        }, { merge: true });

        // Generate notification ID using timestamp
        const notificationId = `N${Date.now()}`;

        // Add notification as subcollection
        await setDoc(doc(db, 'notifications', userId, 'items', notificationId), {
            '01_id': notificationId,
            '02_type': notificationData.type,
            '03_title': notificationData.title,
            '04_message': notificationData.message,
            '05_data': notificationData.data ? JSON.stringify(notificationData.data) : '',
            '06_isRead': false,
            '07_createdAt': Timestamp.now(),
            '08_readAt': null,
        });

        console.log(`✅ Created notification ${notificationId} for user ${userId}`);
        return notificationId;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
    userId: string,
    unreadOnly: boolean = false
): Promise<Notification[]> {
    try {
        const notifications: Notification[] = [];
        const notificationsRef = collection(db, 'notifications', userId, 'items');
        const q = query(notificationsRef, orderBy('07_createdAt', 'desc'));

        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
            const data = doc.data();
            const isRead = data['06_isRead'] === true;

            // Filter by read status if needed
            if (unreadOnly && isRead) {
                return;
            }

            notifications.push({
                id: doc.id,
                userId: userId,
                type: data['02_type'] as NotificationType,
                title: data['03_title'] || '',
                message: data['04_message'] || '',
                data: data['05_data'] ? JSON.parse(data['05_data']) : undefined,
                isRead: isRead,
                createdAt: data['07_createdAt']?.toDate(),
                readAt: data['08_readAt']?.toDate(),
            });
        });

        return notifications;
    } catch (error) {
        console.error('Error fetching user notifications:', error);
        return [];
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
    userId: string,
    notificationId: string
): Promise<void> {
    try {
        const notificationRef = doc(db, 'notifications', userId, 'items', notificationId);

        await updateDoc(notificationRef, {
            '06_isRead': true,
            '08_readAt': Timestamp.now(),
        });

        console.log(`✅ Marked notification ${notificationId} as read`);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for a user (optimized with batch)
 */
export async function markAllAsRead(userId: string): Promise<number> {
    try {
        const unreadNotifications = await getUserNotifications(userId, true);

        if (unreadNotifications.length === 0) {
            return 0;
        }

        // Use batch for better performance
        const batch = writeBatch(db);
        
        for (const notification of unreadNotifications) {
            if (notification.id) {
                const notifRef = doc(db, 'notifications', userId, 'items', notification.id);
                batch.update(notifRef, {
                    '06_isRead': true,
                    '08_readAt': Timestamp.now(),
                });
            }
        }

        await batch.commit();
        console.log(`✅ Marked ${unreadNotifications.length} notifications as read for user ${userId}`);
        
        return unreadNotifications.length;
    } catch (error) {
        console.error('Error marking all as read:', error);
        throw error;
    }
}

/**
 * Delete old notifications (cleanup)
 */
export async function deleteOldNotifications(
    userId: string,
    daysOld: number = 30
): Promise<number> {
    try {
        const notifications = await getUserNotifications(userId);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        let deletedCount = 0;

        for (const notification of notifications) {
            if (notification.createdAt && notification.createdAt < cutoffDate && notification.id) {
                await deleteDoc(doc(db, 'notifications', userId, 'items', notification.id));
                deletedCount++;
            }
        }

        console.log(`✅ Deleted ${deletedCount} old notifications for user ${userId}`);
        return deletedCount;
    } catch (error) {
        console.error('Error deleting old notifications:', error);
        throw error;
    }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        const unreadNotifications = await getUserNotifications(userId, true);
        return unreadNotifications.length;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

/**
 * Delete a specific notification
 */
export async function deleteNotification(
    userId: string,
    notificationId: string
): Promise<void> {
    try {
        await deleteDoc(doc(db, 'notifications', userId, 'items', notificationId));
        console.log(`✅ Deleted notification ${notificationId}`);
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
}
