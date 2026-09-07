import { HealthCheckResponse } from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const checkHealth = async (): Promise<HealthCheckResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data: HealthCheckResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch health check from backend API:', error);
    throw error;
  }
};
