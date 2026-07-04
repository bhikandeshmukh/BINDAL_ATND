/**
 * Create Firestore Collections with Sample Data
 * This will create the basic structure in Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createCollections() {
  console.log('🔥 Creating Firestore Collections...\n');

  try {
    // Create Employees collection with sample data
    console.log('📋 Creating Employees collection...');
    await addDoc(collection(db, 'employees'), {
      name: 'Sample Employee',
      email: 'sample@example.com',
      password: '$2a$10$samplehashedpassword', // This is just a placeholder
      role: 'user',
      perMinuteRate: 0,
      fixedSalary: 0,
      totalWorkingDays: 0,
      createdAt: Timestamp.now(),
    });
    console.log('✅ Employees collection created');

    // Create Attendance collection with sample data
    console.log('📋 Creating Attendance collection...');
    await addDoc(collection(db, 'attendance'), {
      employeeName: 'Sample Employee',
      date: '2025-01-01',
      inTime: '09:00:00 AM',
      outTime: '05:00:00 PM',
      inLocation: '0.0, 0.0',
      outLocation: '0.0, 0.0',
      totalMinutes: 480,
      totalHours: '8h 0m',
      modifiedBy: null,
      createdAt: Timestamp.now(),
    });
    console.log('✅ Attendance collection created');

    // Create LeaveRequests collection with sample data
    console.log('📋 Creating LeaveRequests collection...');
    await addDoc(collection(db, 'leaveRequests'), {
      employeeName: 'Sample Employee',
      startDate: '2025-01-01',
      endDate: '2025-01-02',
      reason: 'Sample leave request',
      status: 'pending',
      createdAt: Timestamp.now(),
    });
    console.log('✅ LeaveRequests collection created');

    // Create NightDuty collection with sample data
    console.log('📋 Creating NightDuty collection...');
    await addDoc(collection(db, 'nightDuty'), {
      employeeName: 'Sample Employee',
      date: '2025-01-01',
      startTime: '10:00:00 PM',
      endTime: '06:00:00 AM',
      status: 'pending',
      createdAt: Timestamp.now(),
    });
    console.log('✅ NightDuty collection created');

    // Create Notifications collection with sample data
    console.log('📋 Creating Notifications collection...');
    await addDoc(collection(db, 'notifications'), {
      userId: 'sample-user-id',
      title: 'Welcome to Firebase!',
      message: 'Your data has been migrated successfully',
      type: 'info',
      read: false,
      createdAt: Timestamp.now(),
    });
    console.log('✅ Notifications collection created');

    console.log('\n✨ All collections created successfully!');
    console.log('\n📝 Next: Run migration script to import actual data');
    console.log('   npm run migrate-to-firebase\n');
    
  } catch (error) {
    console.error('❌ Error creating collections:', error);
  }

  process.exit(0);
}

createCollections();
