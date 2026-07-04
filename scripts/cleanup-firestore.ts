/**
 * Complete Firestore Cleanup
 * Deletes all collections and subcollections
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
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

async function deleteCollection(collectionPath: string) {
    const querySnapshot = await getDocs(collection(db, collectionPath));

    const batch = writeBatch(db);
    let count = 0;

    for (const docSnapshot of querySnapshot.docs) {
        batch.delete(docSnapshot.ref);
        count++;

        if (count % 500 === 0) {
            await batch.commit();
        }
    }

    if (count % 500 !== 0) {
        await batch.commit();
    }

    return count;
}

async function deleteSubcollections(parentCollection: string, subcollectionName: string) {
    const parentDocs = await getDocs(collection(db, parentCollection));
    let totalCount = 0;

    for (const parentDoc of parentDocs.docs) {
        const subcollectionPath = `${parentCollection}/${parentDoc.id}/${subcollectionName}`;
        const count = await deleteCollection(subcollectionPath);
        totalCount += count;
        console.log(`  Deleted ${count} records from ${parentDoc.id}/${subcollectionName}`);
    }

    return totalCount;
}

async function cleanupFirestore() {
    console.log('🗑️  Complete Firestore Cleanup...\n');

    try {
        // Delete attendance subcollections first
        console.log('📋 Deleting attendance records...');
        const attendanceCount = await deleteSubcollections('attendance', 'records');
        console.log(`✓ Deleted ${attendanceCount} attendance records\n`);

        // Delete attendance parent documents
        console.log('📋 Deleting attendance documents...');
        const attendanceDocsCount = await deleteCollection('attendance');
        console.log(`✓ Deleted ${attendanceDocsCount} attendance documents\n`);

        console.log('✅ Firestore cleanup complete!');
        console.log('Now run: npm run migrate-to-firebase\n');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

cleanupFirestore();
