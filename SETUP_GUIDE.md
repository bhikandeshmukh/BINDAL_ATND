# 🚀 Complete Setup Guide

This comprehensive guide will help you set up the Attendance Tracking System with Firebase and all advanced features.

## 📋 Prerequisites

- **Node.js 18+** installed
- **Firebase Project** created
- **Google Cloud Project** (optional, for Sheets backup)
- **Service account credentials** (optional, for Sheets)
- **Git** for version control

## Step 1: Clone & Install

```bash
# Clone repository
git clone https://github.com/bhikandeshmukh/ATND.git
cd ATND

# Install dependencies
npm install
```

This installs all required packages including Firebase, Next.js, and TypeScript tools.

## Step 2: Firebase Setup

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "attendance-tracker")
4. Disable Google Analytics (optional)
5. Click "Create project"

### Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Select "Start in production mode"
4. Choose location (closest to your users)
5. Click "Enable"

### Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click web icon (</>) to add web app
4. Register app with nickname
5. Copy the configuration values

### Configure Environment Variables

Create `.env.local` file in project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Security
JWT_SECRET=your-generated-secret-here
```

### Generate JWT Secret

```bash
node scripts/generate-jwt-secret.js
```

Copy the generated secret to `.env.local`

## Step 3: Initialize Firebase Collections

Run the initialization script:

```bash
npm run create-firebase-collections
```

This creates the following Firestore collections:

### Collections Created:

1. **employees** - Employee records
   - Fields: id, name, position, role, status, email, etc.
   - Indexes: role, status, username

2. **attendance** - Daily attendance (with subcollections)
   - Structure: `attendance/{employeeName}/records/{date}`
   - Fields: date, inTime, outTime, totalMinutes, etc.

3. **leaves** - Leave requests
   - Fields: employeeName, leaveType, startDate, endDate, status
   - Indexes: status, employeeName

4. **nightDuty** - Night duty requests
   - Fields: employeeName, date, status, approvedBy
   - Indexes: status, date

5. **notifications** - User notifications (with subcollections)
   - Structure: `notifications/{userId}/items/{notificationId}`
   - Fields: title, message, type, isRead, createdAt

6. **auditLogs** - Change history
   - Fields: action, entityType, performedBy, timestamp
   - Indexes: entityType, timestamp

## Step 4: Create First Admin User

### Option 1: Using Script (Recommended)

```bash
npm run set-admin-password
```

Follow the prompts to create admin user.

### Option 2: Manual Firebase Entry

Add document to `employees` collection:

```json
{
  "id": "001",
  "name": "Admin User",
  "position": "Administrator",
  "role": "admin",
  "status": "active",
  "totalWorkingDays": 26,
  "fixedInTime": "10:00:00 AM",
  "fixedOutTime": "07:00:00 PM",
  "fixedSalary": 50000,
  "username": "admin",
  "password": "$2a$10$YourBcryptHashHere",
  "email": "admin@company.com",
  "createdAt": "2025-01-31T00:00:00.000Z"
}
```

**Note:** Use bcrypt to hash password before adding.

- Leaves
- Night Duty
- Notifications
- Audit Logs

## Step 6: Run Application

### Development Mode

```bash
npm run dev
```

Open http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

### Login

- **Username:** `admin`
- **Password:** `admin123` (or what you set)
- **⚠️ Change password immediately after first login!**

## Step 7: Test Features

### ✅ Test Basic Features

1. **Login**
   - Use admin credentials
   - Verify role-based access

2. **Attendance**
   - Mark check-in
   - Mark check-out
   - View attendance records

3. **Leave Management**
   - Apply for leave
   - Admin: Approve/reject leaves
   - Check status colors (Green/Red/Yellow)

4. **Night Duty**
   - Request night duty
   - Admin: Approve/reject requests
   - View history

### 🔔 Test Notifications

1. **User Notifications**
   - Click notification bell
   - View unread count
   - Mark individual as read
   - Mark all as read

2. **Admin Notification History**
   - Go to Notifications tab
   - Filter by employee
   - View all sent notifications

### 📊 Test Reports

1. **Monthly Reports**
   - Select month/year
   - View attendance summary
   - Export to CSV

2. **Employee Reports**
   - View individual employee data
   - Check overtime calculations
   - Export reports

### 📥 Test Bulk Import

1. **Download Templates**
   - Go to Import Data tab
   - Download CSV templates

2. **Import Data**
   - Fill template with data
   - Upload CSV file
   - Verify import results

### 🎨 Test UI Features

1. **Sidebar Navigation**
   - Desktop: Collapse/expand sidebar
   - Mobile: Hamburger menu
   - Verify default closed state

2. **Status Colors**
   - Approved: Green
   - Rejected: Red
   - Pending: Yellow

## Troubleshooting

### Error: Firebase permission denied
- Verify Firestore rules allow the authenticated operation
- Check Firebase project ID and web app credentials
- Restart the development server after changing environment variables

### Email not sending:
- Verify SMTP credentials are correct
- Check firewall/network settings
- Test SMTP connection separately
- Check email service logs

## Next Steps

After successful setup:

1. **Configure Salary Rules**: Use fixed monthly salary and approved paid/unpaid leaves
2. **Add Holidays**: Import or manually add company holidays
3. **Create Shifts**: Define work shifts for your organization
4. **Train Users**: Inform employees about new features
5. **Monitor Audit Logs**: Review system changes regularly

## Support

For issues or questions:
1. Check the main README.md
2. Review the spec files in `.kiro/specs/advanced-features/`
3. Check console logs for error details
4. Verify Firestore collections contain the expected documents

## Security Notes

- **Password Reset Tokens**: Expire after 1 hour
- **Audit Logs**: Cannot be modified or deleted
- **Email Notifications**: Contain no sensitive data
- **Overtime Approval**: Requires admin authorization
- **Shift Management**: Admin-only feature

## Performance Tips

- **Large Datasets**: Use pagination for reports
- **Email Sending**: Batch notifications when possible
- **Audit Logs**: Archive old logs periodically
- **Caching**: Shift and holiday data is cached

## Maintenance

### Daily:
- Clean up expired reset tokens (automatic)

### Weekly:
- Review audit logs for anomalies
- Check email delivery success rate

### Monthly:
- Archive old audit logs
- Review overtime calculations
- Update holiday calendar

### Quarterly:
- Review and optimize overtime rules
- Audit security settings
- Update employee shift assignments
