import dotenv from 'dotenv';
import path from 'path';

// Load .env from process.cwd() as well as server directory explicitly
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  clientUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(
      `FATAL CONFIGURATION ERROR: Required environment variable "${key}" is missing or empty. Please set "${key}" in your .env file.`
    );
  }
  return value.trim();
};

export const config: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clrms',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
};


