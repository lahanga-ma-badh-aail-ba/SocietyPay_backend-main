// Extend Express Request type globally
declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      userId?: string;
      email?: string;
      role: string;
    };
  }
}