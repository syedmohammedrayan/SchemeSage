import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables from the .env file in the root directory
dotenv.config({ path: '../.env' });

async function createGovUser() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKeyRaw) {
      console.error('❌ Firebase credentials missing in .env file.');
      process.exit(1);
    }

    // Format the private key to handle newline characters properly
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/"/g, '');

    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    const auth = getAuth(app);
    const db = getFirestore(app);

    const email = 'tg@gmail.com';
    const password = 'tgsgov';
    console.log(`\n⏳ Creating Firebase Auth user for ${email}...`);
    
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: true,
      });
      console.log('✅ Successfully created new user in Firebase Auth:', userRecord.uid);
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(email);
        console.log('ℹ️ User already exists in Firebase Auth:', userRecord.uid);
      } else {
        throw e;
      }
    }

    console.log('\n⏳ Provisioning Firestore profile for the Government Portal...');
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      fullName: 'Government Official',
      email: email,
      mobile: '',
      state: 'central',
      district: '',
      role: 'government',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    console.log('✅ Firestore profile provisioned successfully!\n');
    console.log('====================================================');
    console.log('🎉 SUCCESS! You can now log in to the Government Portal.');
    console.log(`✉️  Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log('====================================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
}

createGovUser();
