/**
 * Set Admin Password in Firebase (Plain Text)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
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

async function setAdminPassword() {
  try {
    const newPassword = 'admin123';

    await updateDoc(doc(db, 'employees', 'admin'), {
      '12_password': newPassword,
    });

    console.log('✅ Admin password set to: admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting password:', error);
    process.exit(1);
  }
}

setAdminPassword();
