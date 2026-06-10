import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, '');
  env[key] = val;
}

const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});

const db = admin.firestore();
const auth = admin.auth();

async function createGovUser() {
  const email = 'tg@gmail.com';
  const password = 'tgsgov';

  try {
    // 1. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: 'TG Government Official',
    });

    console.log(`✅ Firebase Auth user created: ${userRecord.uid}`);

    // 2. Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role: 'government' });
    console.log('✅ Custom claim set: role = government');

    // 3. Create Firestore profile
    const profile = {
      id: userRecord.uid,
      fullName: 'TG Government Official',
      email,
      mobile: '',
      state: 'Telangana',
      district: '',
      role: 'government',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(profile);
    console.log('✅ Firestore profile created');

    console.log('\n🎉 Government account ready!');
    console.log(`   Email   : ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role    : government`);
    console.log(`   UID     : ${userRecord.uid}`);

  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      console.log('⚠️  User already exists in Firebase Auth. Updating Firestore profile...');
      const existing = await auth.getUserByEmail(email);
      await db.collection('users').doc(existing.uid).set({
        id: existing.uid,
        fullName: 'TG Government Official',
        email,
        mobile: '',
        state: 'Telangana',
        district: '',
        role: 'government',
        status: 'active',
        createdAt: new Date().toISOString(),
      }, { merge: true });
      console.log('✅ Firestore profile updated!');
    } else {
      console.error('❌ Error:', err.message);
    }
  }

  process.exit(0);
}

createGovUser();
