import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

// Augment Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using a Bearer Access Token in the Authorization header.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Access token missing or invalid format. Expected: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = authService.verifyAccessToken(token);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired access token',
    });
  }
};
