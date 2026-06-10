import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { auth, db } from '../config/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper to sanitize user object — strips password and internal fields
const sanitizeUser = (user: any) => {
  if (!user) return null;
  const { password, _id, ...cleanUser } = user;
  return cleanUser;
};

// Portal role groups: 'admin' portal = admin + agent roles, 'government' portal = government role only
const portalRoleMap: Record<string, string[]> = {
  'admin': ['admin', 'agent'],
  'government': ['government'],
};

// ─── REGISTER ───────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { 
      fullName, email, mobile, password, state, district, role, 
      aadharNumber, panNumber, meeSevaId, address, expertise 
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    const userRole = role || 'admin';

    if (userRole === 'citizen') {
      return res.status(400).json({ error: 'Citizen registration is not supported.' });
    }
    if (userRole === 'government') {
      return res.status(400).json({ error: 'Government accounts cannot be self-registered.' });
    }

    // Check for duplicate email in pending_registrations or existing users
    const existingPending = await db.collection('pending_registrations').where('email', '==', email).get();
    if (!existingPending.empty) {
      return res.status(400).json({ error: 'An application with this email is already pending review.' });
    }

    // Also check active users
    try {
      await auth.getUserByEmail(email);
      return res.status(400).json({ error: 'Email already registered.' });
    } catch (err: any) {
      // auth/user-not-found is expected — continue
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // Save registration request to pending_registrations (NO Firebase Auth account yet)
    const pendingId = crypto.randomUUID();
    await db.collection('pending_registrations').doc(pendingId).set({
      id: pendingId,
      fullName,
      email,
      mobile: mobile || '',
      password, // stored temporarily — will be used to create Firebase Auth on approval
      state: state || '',
      district: district || '',
      role: userRole,
      aadharNumber: aadharNumber || '',
      panNumber: panNumber || '',
      meeSevaId: meeSevaId || '',
      address: address || '',
      expertise: expertise || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ 
      message: 'Registration submitted. You will be able to log in once a government official approves your application.',
      status: 'pending'
    });
  } catch (error) {
    console.error('[Registration Error]', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, loginRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Authenticate with Firebase Auth REST API
    let idToken: string;
    let localId: string;

    try {
      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      if (!apiKey) throw new Error('Firebase API key is not configured on the server.');

      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        { email, password, returnSecureToken: true }
      );
      idToken = response.data.idToken;
      localId = response.data.localId;
    } catch (err: any) {
      const errorCode = err.response?.data?.error?.message;
      if (
        errorCode === 'EMAIL_NOT_FOUND' ||
        errorCode === 'INVALID_PASSWORD' ||
        errorCode === 'INVALID_LOGIN_CREDENTIALS'
      ) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      throw err;
    }

    // Retrieve Firestore user profile
    const userDoc = await db.collection('users').doc(localId).get();
    let user = userDoc.data();

    // Auto-provision Firestore profile for government users added via Firebase Console
    // These users exist in Firebase Auth but have no Firestore record yet
    if (!user && loginRole === 'government') {
      console.log(`[Auth] Auto-provisioning Firestore profile for Firebase-added government user: ${email}`);
      const newProfile = {
        id: localId,
        fullName: email.split('@')[0], // Placeholder — they can update in profile settings
        email,
        mobile: '',
        state: '',
        district: '',
        role: 'government',
        status: 'active', // Trusted — was manually added in Firebase Console by admin
        createdAt: new Date().toISOString(),
      };
      await db.collection('users').doc(localId).set(newProfile);
      user = newProfile;
    }

    if (!user) {
      return res.status(401).json({ error: 'User profile not found. Please register first.' });
    }

    // Portal isolation: prevent cross-portal login
    if (loginRole && portalRoleMap[loginRole] && !portalRoleMap[loginRole].includes(user.role)) {
      return res.status(403).json({ 
        error: `Access denied. This account belongs to the ${user.role} role and cannot log in through the ${loginRole === 'admin' ? 'Admin/Agent' : 'Government'} portal.`
      });
    }

    // Status check: pending or rejected accounts cannot log in
    const userStatus = user.status || 'active';
    if (userStatus === 'pending' || userStatus === 'rejected') {
      return res.status(403).json({ 
        error: userStatus === 'pending' 
          ? 'Your account is pending approval by a government official.' 
          : 'Your account registration was declined. Please contact support.'
      });
    }

    res.json({ token: idToken, user: sanitizeUser(user) });
  } catch (error: any) {
    console.error('❌ [Login Error]', error);
    res.status(500).json({ error: 'Authentication service unavailable. Please try again.' });
  }
});

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId!).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ user: sanitizeUser(userDoc.data()) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
router.patch('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, mobile, address, email, avatarUrl } = req.body;
    
    if (!fullName) return res.status(400).json({ error: 'Full name is required' });

    // Check email conflict
    if (email) {
      const conflict = await db.collection('users').where('email', '==', email).get();
      let hasConflict = false;
      conflict.forEach((doc: any) => { if (doc.id !== req.userId) hasConflict = true; });
      if (hasConflict) return res.status(400).json({ error: 'Email already in use by another account' });
    }

    const userRef = db.collection('users').doc(req.userId!);
    const currentDoc = await userRef.get();
    if (!currentDoc.exists) return res.status(404).json({ error: 'User not found' });

    await userRef.update({
      fullName,
      mobile: mobile || '',
      address: address || '',
      email: email || currentDoc.data()?.email,
      avatarUrl: avatarUrl || '',
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await userRef.get();
    res.json({ user: sanitizeUser(updatedDoc.data()) });
  } catch (error: any) {
    console.error('❌ [Profile Update Error]', error);
    res.status(500).json({ error: 'Failed to update profile.', details: error.message });
  }
});

export default router;
