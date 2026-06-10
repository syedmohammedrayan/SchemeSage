import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'ai-welfare-nav-hackathon-secret-2024';

export function signToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, SECRET) as any;
  } catch {
    return null;
  }
}
