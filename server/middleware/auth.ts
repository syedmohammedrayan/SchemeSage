import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/db.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userEmail?: string;
  user?: any;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.split(' ')[1];
    const decoded = await auth.verifyIdToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user profile from Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    req.userId = decoded.uid;
    req.userRole = userData?.role || decoded.role || 'citizen';
    req.userEmail = decoded.email;
    req.user = userData;

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

export async function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return next();

    const token = header.split(' ')[1];
    const decoded = await auth.verifyIdToken(token);
    if (!decoded) return next();

    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return next();

    const userData = userDoc.data();
    req.userId = decoded.uid;
    req.userRole = userData?.role || decoded.role || 'citizen';
    req.userEmail = decoded.email;
    req.user = userData;

    next();
  } catch {
    next(); // Continue without auth on any error (optional middleware)
  }
}
