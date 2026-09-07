import mongoose from 'mongoose';
import { config } from './env.js';

export type DatabaseStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

let dbStatus: DatabaseStatus = 'disconnected';
let dbErrorMessage: string | null = null;

export const connectDatabase = async (): Promise<void> => {
  try {
    dbStatus = 'connecting';
    dbErrorMessage = null;

    mongoose.connection.on('connected', () => {
      dbStatus = 'connected';
      console.log(' [MongoDB] Database connected successfully.');
    });

    mongoose.connection.on('error', (err: Error) => {
      dbStatus = 'error';
      dbErrorMessage = err.message;
      console.error(' [MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      dbStatus = 'disconnected';
      console.warn(' [MongoDB] Database disconnected.');
    });

    await mongoose.connect(config.mongodbUri, {
      family: 4,
      serverSelectionTimeoutMS: 15000,
    });

    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    dbErrorMessage = error instanceof Error ? error.message : 'Unknown MongoDB connection error';
    console.error(' [MongoDB] Initial connection failed:', dbErrorMessage);
    console.warn(' [MongoDB] Continuing server execution in degraded DB state.');
  }
};

export const getDatabaseStatus = (): { status: DatabaseStatus; error: string | null } => {
  const readyState = mongoose.connection.readyState;
  let statusText: DatabaseStatus = dbStatus;

  switch (readyState) {
    case 1:
      statusText = 'connected';
      break;
    case 2:
      statusText = 'connecting';
      break;
    case 0:
    case 3:
    default:
      if (dbStatus !== 'error') {
        statusText = 'disconnected';
      }
      break;
  }

  return {
    status: statusText,
    error: dbErrorMessage,
  };
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    dbStatus = 'disconnected';
    console.log(' [MongoDB] Database disconnected gracefully.');
  } catch (error) {
    console.error(' [MongoDB] Error during disconnect:', error);
  }
};

