import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AuthTokenPayload } from '../types/user.js';

/**
 * Generate a signed JWT token containing user identity and role.
 */
export const generateToken = (payload: AuthTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as any,
  };

  return jwt.sign(payload, config.jwtSecret, options);
};

/**
 * Verify a JWT token and extract the payload.
 * Throws an error if expired, malformed, or invalid signature.
 */
export const verifyToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
};
