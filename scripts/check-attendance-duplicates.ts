import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function checkDuplicates() {
    console.log('🔍 Checking Firestore for Attendance duplicates...\n');
    try {
        const employeesSnapshot = await getDocs(collection(db, 'attendance'));
        console.log(`Found ${employeesSnapshot.docs.length} employee documents under 'attendance':`);
        
        const employeeNames = employeesSnapshot.docs.map(doc => doc.id);
        console.log(employeeNames);
        
        // Check for case-insensitive or space-varying name duplicates
        const normalizedMap = new Map<string, string[]>();
        employeeNames.forEach(name => {
            const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const existing = normalizedMap.get(norm) || [];
            existing.push(name);
            normalizedMap.set(norm, existing);
        });

        console.log('\n--- Name Matching Inspection ---');
        normalizedMap.forEach((names, norm) => {
            if (names.length > 1) {
                console.log(`⚠️ Possible duplicate employees found for normalized key "${norm}":`, names);
            } else {
                console.log(`  "${norm}" matches unique name: "${names[0]}"`);
            }
        });

        console.log('\n--- Attendance Records Inspection ---');
        for (const name of employeeNames) {
            const recordsRef = collection(db, 'attendance', name, 'records');
            const recordsSnapshot = await getDocs(recordsRef);
            console.log(`\nEmployee: "${name}" has ${recordsSnapshot.docs.length} attendance records:`);
            recordsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`  - Date: "${doc.id}" -> In Time: "${data['02_inTime']}", Out Time: "${data['03_outTime']}"`);
            });
        }

    } catch (err) {
        console.error('❌ Error checking duplicates:', err);
    }
    process.exit(0);
}

checkDuplicates();
