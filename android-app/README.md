# Attendance Tracker - Android App

A native Kotlin Android app for employee attendance tracking with light theme and bottom navigation.

## Features

- 📋 **Attendance** - Check in/out with location tracking
- 🌙 **Night Duty** - Request and manage night duty shifts
- 🏖️ **Leaves** - Apply and manage leave requests
- 📊 **Reports** - View attendance reports and earnings
- 🔔 **Notifications** - Real-time notifications
- 👥 **Employees** - Employee management (Admin only)

## Tech Stack

- **Language**: Kotlin
- **UI**: Jetpack Compose with Material 3
- **Architecture**: MVVM with Clean Architecture
- **DI**: Hilt
- **Networking**: Retrofit + OkHttp
- **Database**: Firebase Firestore
- **Location**: Google Play Services Location
- **Navigation**: Jetpack Navigation Compose

## Setup

1. **Clone the repository**

2. **Configure API URL**
   - Open `di/AppModule.kt`
   - Replace `BASE_URL` with your API endpoint

3. **Add Firebase**
   - Create a Firebase project
   - Download `google-services.json`
   - Place it in `app/` directory

4. **Build & Run**
   ```bash
   ./gradlew assembleDebug
   ```

## Project Structure

```
app/src/main/java/com/attendance/tracker/
├── AttendanceApp.kt          # Application class
├── MainActivity.kt           # Main activity with navigation
├── MainViewModel.kt          # Main view model
├── data/
│   ├── api/
│   │   └── ApiService.kt     # Retrofit API interface
│   ├── model/
│   │   └── Models.kt         # Data models
│   └── repository/           # Repository classes
├── di/
│   └── AppModule.kt          # Hilt dependency injection
└── ui/
    ├── navigation/
    │   └── Navigation.kt     # Navigation routes
    ├── screens/
    │   ├── attendance/       # Attendance screen
    │   ├── employees/        # Employee management
    │   ├── leaves/           # Leave management
    │   ├── login/            # Login screen
    │   ├── nightduty/        # Night duty screen
    │   ├── notifications/    # Notifications screen
    │   └── reports/          # Reports screen
    └── theme/
        ├── Theme.kt          # Light theme
        └── Type.kt           # Typography
```

## Permissions Required

- `INTERNET` - API calls
- `ACCESS_FINE_LOCATION` - Location tracking
- `ACCESS_COARSE_LOCATION` - Location tracking
- `POST_NOTIFICATIONS` - Push notifications

## Building APK

```bash
# Debug APK
./gradlew assembleDebug

# Release APK (requires signing config)
./gradlew assembleRelease
```

The APK will be generated at:
- Debug: `app/build/outputs/apk/debug/app-debug.apk`
- Release: `app/build/outputs/apk/release/app-release.apk`

## License

© 2025-26 Bhikan Deshmukh. All rights reserved.
