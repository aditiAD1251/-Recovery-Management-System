export interface HealthCheckResponse {
  success: boolean;
  message: string;
  timestamp: string;
  service?: string;
  version?: string;
  environment?: string;
  database?: {
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
    connected: boolean;
    error: string | null;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export type ConnectionState = 'idle' | 'loading' | 'connected' | 'error';

export * from './auth';
export * from './masterData';
export * from './loan';
export * from './assignment';
export * from './collectionAttempt';
export * from './promiseToPay';
export * from './settlement';
export * from './legal';
export * from './analytics';



