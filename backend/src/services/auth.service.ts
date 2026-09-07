import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { SignupInput, LoginInput } from '../validators/auth.validator';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret-fallback';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-fallback';

// Dummy hash used to mitigate timing attacks when a user is not found
const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

export interface TokenPayload {
  userId: string;
}

export class AuthService {
  /**
   * Generates a short-lived access token (15 minutes).
   */
  generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
  }

  /**
   * Generates a long-lived refresh token (7 days).
   */
  generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  }

  /**
   * Verifies an access token and extracts the payload.
   */
  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  }

  /**
   * Verifies a refresh token and extracts the payload.
   */
  verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  }

  /**
   * Registers a new user with a hashed password.
   */
  async signup(input: SignupInput) {
    const normalizedEmail = input.email.toLowerCase();

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const error: any = new Error('Email is already registered');
      error.statusCode = 409;
      throw error;
    }

    // Hash password with bcrypt (10 rounds of salt)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: input.name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Authenticates user, guards against timing attacks, and generates token pair.
   */
  async login(input: LoginInput) {
    const normalizedEmail = input.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user is not found, compare with DUMMY_HASH to consume the same CPU time
    // and protect against response-time based user enumeration attacks.
    const targetHash = user ? user.passwordHash : DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(input.password, targetHash);

    if (!user || !isPasswordValid) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verifies refresh token and issues a fresh access token.
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.verifyRefreshToken(refreshToken);
      const newAccessToken = this.generateAccessToken(payload.userId);
      return { accessToken: newAccessToken };
    } catch {
      const error: any = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }
  }
}

export const authService = new AuthService();
