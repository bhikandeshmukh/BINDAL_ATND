# 📋 Attendance Tracker

Modern employee attendance management system with Firebase Firestore integration.

## ✨ Features

### 🎯 Core Features
- **Role-based Access** - Admin & User roles with different permissions
- **Geolocation Verification** - 20m radius check for attendance
- **Check-in/Check-out Tracking** - Real-time attendance monitoring
- **Leave Management** - Apply, approve/reject leaves with payment status
- **Night Duty Requests** - Special shift management
- **Monthly Reports** - Comprehensive attendance reports with export

### 🚀 Advanced Features
- **Firebase Integration** - Real-time data sync and offline support
- **In-App Notifications** - Real-time notifications for leaves, attendance, and system events
- **Notification History** - Admin can view all notifications sent to employees
- **Audit Logging** - Complete history tracking for all attendance modifications
- **Bulk Import/Export** - CSV import for employees, attendance, leaves, night duty
- **Email Field** - Employee email management
- **Google Analytics** - Track app usage and user behavior
- **PWA Support** - Install as mobile/desktop app
- **Responsive Sidebar** - Collapsible navigation for better UX
- **Status Colors** - Green for approved, Red for rejected, Yellow for pending

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase
Create a Firebase project and add credentials to `.env.local`:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Security
JWT_SECRET=your-generated-secret
```

### 3. Generate JWT Secret
```bash
node scripts/generate-jwt-secret.js
```

### 4. Initialize Firebase Collections
```bash
npm run create-firebase-collections
```

This creates:
- `employees` - Employee records
- `attendance` - Daily attendance with subcollections
- `leaves` - Leave requests
- `nightDuty` - Night duty requests
- `notifications` - User notifications
- `auditLogs` - Change history

### 5. Create First Admin
```bash
npm run set-admin-password
```

Or manually add to Firebase `employees` collection:
```json
{
  "id": "001",
  "name": "Admin User",
  "position": "Administrator",
  "role": "admin",
  "status": "active",
  "totalWorkingDays": 26,
  "fixedInTime": "09:00:00 AM",
  "fixedOutTime": "07:00:00 PM",
  "perMinuteRate": 0,
  "fixedSalary": 50000,
  "username": "admin",
  "password": "$2a$10$...", // bcrypt hash of "admin123"
  "email": "admin@company.com"
}
```

### 6. Run Development Server
```bash
npm run dev
```

### 7. Login
- URL: http://localhost:3000
- Username: `admin`
- Password: `admin123`
- **⚠️ Change password immediately!**

## 📱 Build & Deploy

### Production Build
```bash
npm run build
npm start
```

### PWA Icons
```bash
node scripts/generate-icons.js
```

## 📱 Android App

Native Kotlin Android app is also available in `android-app/` folder with same features.

### 🎯 Android App Screens

| Screen | Description |
|--------|-------------|
| 🔐 **Login** | Username/password + Google Sign-In with gradient background |
| 📋 **Attendance** | Check In/Out buttons, real-time earning, today's status with location |
| 🏖️ **Leaves** | Apply for leaves, view status (Pending/Approved/Rejected), admin approval |
| 🌙 **Night Duty** | Request night shifts, admin can approve/reject |
| 📊 **Reports** | Monthly summary, total days, hours, earnings, attendance history |
| 🔔 **Notifications** | Alerts for leave/night duty approvals, mark as read |
| 👥 **Employees** | Admin only - Add/Edit/Delete employees, search, role badges |

> 📂 **Interactive Preview:** Open [`android-app/ui-preview.html`](android-app/ui-preview.html) in browser to see all UI screens

### Android Features
- ✅ Light Theme with Material 3
- ✅ Bottom Navigation (5 tabs)
- ✅ Check In/Out with GPS Location
- ✅ Real-time Earning Display
- ✅ Leave & Night Duty Management
- ✅ Push Notifications
- ✅ Admin & User Roles
- ✅ Google Sign-In
- ✅ AdMob Ads Integration
- ✅ Direct Firebase Connection

### Android Tech Stack
| Technology | Purpose |
|------------|---------|
| Kotlin | Programming Language |
| Jetpack Compose | Modern UI Framework |
| Material 3 | Design System |
| Hilt | Dependency Injection |
| Firebase Firestore | Database |
| Google Play Services | Location & Auth |
| AdMob | Monetization |

### Android App Info
| Property | Value |
|----------|-------|
| Package Name | `com.attendance.tracker` |
| Min SDK | 26 (Android 8.0) |
| Target SDK | 34 (Android 14) |
| Version | 1.0 |

### Build Android APK
```bash
cd android-app
./gradlew assembleDebug
```
APK location: `app/build/outputs/apk/debug/app-debug.apk`

### Release APK
```bash
cd android-app
./gradlew assembleRelease
```

---

## 🎨 UI Features

### Sidebar Navigation
- **Desktop**: Permanent sidebar with collapse option
- **Mobile**: Hamburger menu (closed by default)
- **Icons**: Emoji icons for better visual recognition

### Status Colors
- 🟢 **Green**: Approved
- 🔴 **Red**: Rejected  
- 🟡 **Yellow**: Pending

### Notifications
- Real-time notification bell with unread count
- Mark individual or all as read
- Admin notification history view

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **PWA** - Progressive Web App support

### Backend
- **Firebase Firestore** - Real-time NoSQL database
- **Next.js API Routes** - Serverless functions

### Security
- **JWT** - JSON Web Tokens for auth
- **bcrypt** - Password hashing
- **Rate Limiting** - Login attempt protection

### Analytics
- **Google Analytics** - User tracking (G-3FT6WYSXT9)

## 📦 Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Utility Scripts
npm run create-firebase-collections  # Create Firestore collections
npm run cleanup-firestore        # Clean old data
npm run set-admin-password      # Set/reset admin password
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Bhikan Deshmukh**
- GitHub: [@bhikandeshmukh](https://github.com/bhikandeshmukh)
- Email: thebhikandeshmukh@gmail.com

## 🙏 Acknowledgments

- Firebase for real-time database
- Firebase for data export
- Next.js team for the amazing framework
- All contributors and users

---

Made with ❤️ by Bhikan Deshmukh
