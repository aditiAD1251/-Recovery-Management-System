export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  error?: string;
}

export interface HealthCheckData {
  service: string;
  version: string;
  uptime: number;
  environment: string;
  database: {
    status: string;
    error: string | null;
  };
}

export * from './user.js';
export * from './region.js';
export * from './agent.js';
export * from './loan.js';
export * from './assignment.js';
export * from './collectionAttempt.js';
export * from './promiseToPay.js';
export * from './settlement.js';
export * from './legal.js';
export * from './analytics.js';




