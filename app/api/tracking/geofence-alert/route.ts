import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees } from '@/lib/firebase/employees';
import { createNotification, NotificationType } from '@/lib/notifications/service';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/geofence-alert
 * Handle geofence exit alerts
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { userId, userName, distance, latitude, longitude, timestamp } = body;

    if (!userId || !userName || !distance) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (auth.user?.role !== 'admin' && (auth.user?.userId !== userId || auth.user?.name !== userName)) {
      return NextResponse.json(
        { error: 'Forbidden - You can only submit your own geofence alerts' },
        { status: 403 }
      );
    }

    console.log(`⚠️ GEOFENCE ALERT: ${userName} is ${distance.toFixed(0)}m away from office!`);

    // Get all admin users
    const employees = await getAllEmployees();
    const admins = employees.filter((emp) => emp.role === 'admin');

    // Send notification to user
    await createNotification({
      userId: userId,
      type: NotificationType.SYSTEM_ALERT,
      title: '⚠️ Geofence Alert',
      message: `You are ${distance.toFixed(0)}m away from office location. Please return to office premises.`,
      data: {
        distance,
        latitude,
        longitude,
        timestamp,
      },
    });

    // Send notification to all admins
    for (const admin of admins) {
      if (admin.id) {
        await createNotification({
          userId: admin.id,
          type: NotificationType.SYSTEM_ALERT,
          title: '⚠️ Employee Left Office Area',
          message: `${userName} is ${distance.toFixed(0)}m away from office location at ${new Date(timestamp).toLocaleTimeString()}`,
          data: {
            employeeId: userId,
            employeeName: userName,
            distance,
            latitude,
            longitude,
            timestamp,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Geofence alert sent',
      notificationsSent: admins.length + 1,
    });
  } catch (error) {
    console.error('Error processing geofence alert:', error);
    return NextResponse.json(
      { error: 'Failed to process geofence alert' },
      { status: 500 }
    );
  }
}
