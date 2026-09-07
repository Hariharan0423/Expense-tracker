import { Request, Response, NextFunction, CookieOptions } from 'express';
import { ZodError } from 'zod';
import { authService } from '../services/auth.service';
import { signupSchema, loginSchema } from '../validators/auth.validator';

export const REFRESH_COOKIE_NAME = 'refreshToken';

export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = signupSchema.parse(req.body);
      const user = await authService.signup(validatedData);

      return res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Internal server error',
      });
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await authService.login(validatedData);

      // Attach refresh token in a secure, httpOnly cookie
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

      // Return short-lived access token in the response body
      return res.status(200).json({
        message: 'Logged in successfully',
        accessToken,
        user,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Internal server error',
      });
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

      if (!refreshToken) {
        return res.status(401).json({
          message: 'Refresh token missing',
        });
      }

      const { accessToken } = await authService.refresh(refreshToken);

      return res.status(200).json({
        accessToken,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 401).json({
        message: error.message || 'Invalid or expired refresh token',
      });
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Clear the refresh token cookie
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

      return res.status(200).json({
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || 'Failed to logout',
      });
    }
  }
}

export const authController = new AuthController();
