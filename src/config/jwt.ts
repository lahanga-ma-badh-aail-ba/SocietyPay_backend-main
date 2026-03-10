import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-me';

export const generateToken = (payload: { userId: string; email: string; role: string }): string => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '7d'
  });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};