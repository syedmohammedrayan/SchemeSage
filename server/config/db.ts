import admin from 'firebase-admin';

let isConnected = false;
export let db: admin.firestore.Firestore;
export let auth: admin.auth.Auth;

export const connectDB = async () => {
  try {
    console.log("[🚀 Firebase] Initializing Admin SDK...");
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKeyRaw) {
      console.warn("⚠️ Firebase configuration missing from environment variables.");
      // Fallback for offline/development mode to prevent crash if not configured yet
      isConnected = false;
      return false;
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/"/g, '');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    db = admin.firestore();
    auth = admin.auth();
    isConnected = true;
    console.log("[🚀 Firebase] Connected Successfully to Project:", projectId);
    return true;
  } catch (error: any) {
    isConnected = false;
    console.error("[🚨 Firebase Error] Initialization failed:", error.message);
    return false;
  }
};

export const getDbStatus = () => ({
  connected: isConnected,
  provider: 'firestore',
  projectId: process.env.FIREBASE_PROJECT_ID || 'unknown',
});
