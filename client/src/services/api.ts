// Enhanced API service with automatic token refresh

import { ApiResponse } from '../types';
import { authService } from './auth.service';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error?.message || `HTTP error! status: ${response.status}`
      );
    }

    return data.data as T;
  }

  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      return await this.request<T>(endpoint, config);
    } catch (error) {
      // If request fails with 401, try to refresh token
      if (error instanceof Error && error.message.includes('401')) {
        try {
          await authService.refreshToken();
          // Retry the request with new token
          const newToken = authService.getAccessToken();
          if (newToken) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            };
            return await this.request<T>(endpoint, config);
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and throw original error
          authService.clearTokens();
          throw error;
        }
      }
      throw error;
    }
  }

  // Public endpoints (no authentication required)
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Authenticated endpoints
  async getAuthenticated<T>(endpoint: string): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, { method: 'GET' });
  }

  async postAuthenticated<T>(endpoint: string, data?: any): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async putAuthenticated<T>(endpoint: string, data?: any): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async deleteAuthenticated<T>(endpoint: string): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, { method: 'DELETE' });
  }

  // Legacy methods for backward compatibility
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.putAuthenticated<T>(endpoint, data);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.deleteAuthenticated<T>(endpoint);
  }
}

export const apiService = new ApiService();
