// Enhanced API service with automatic token refresh, caching, and request deduplication

import { ApiResponse } from '../types';
import { authService } from './auth.service';
import { store } from '../store';
import { clearCredentials } from '../store/slices/authSlice';
import { ApiErrorHandler } from './apiErrorHandler';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RequestOptions extends Omit<RequestInit, 'cache'> {
  cache?: boolean;
  cacheTTL?: number; // Time to live in milliseconds
}

export class ApiService {
  private baseURL: string;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    
    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  private cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  private getCacheKey(endpoint: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    this.cache.set(key, entry);
  }

  public clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { cache = false, cacheTTL = 5 * 60 * 1000, ...fetchOptions } = options;
    const cacheKey = this.getCacheKey(endpoint, fetchOptions);
    
    // Check cache for GET requests
    if (cache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
      const cachedData = this.getFromCache<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Check for pending request (request deduplication)
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    };

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
          (error as any).response = { status: response.status, data: errorData };
          throw error;
        }

        const data: ApiResponse<T> = await response.json();

        if (!data.success) {
          const error = new Error(data.error?.message || 'Request failed');
          (error as any).response = { status: response.status, data };
          throw error;
        }

        const result = data.data as T;

        // Cache successful GET requests
        if (cache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
          this.setCache(cacheKey, result, cacheTTL);
        }

        return result;
      } catch (error) {
        throw ApiErrorHandler.handle(error);
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(cacheKey);
      }
    })();

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const config: RequestOptions = {
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
          store.dispatch(clearCredentials());
          throw error;
        }
      }
      throw error;
    }
  }

  // Public endpoints (no authentication required)
  async get<T>(endpoint: string, options?: { cache?: boolean; cacheTTL?: number }): Promise<T> {
    return this.request<T>(endpoint, { 
      method: 'GET',
      cache: options?.cache,
      cacheTTL: options?.cacheTTL,
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Authenticated endpoints
  async getAuthenticated<T>(endpoint: string, options?: { cache?: boolean; cacheTTL?: number }): Promise<T> {
    return this.authenticatedRequest<T>(endpoint, { 
      method: 'GET',
      cache: options?.cache,
      cacheTTL: options?.cacheTTL,
    });
  }

  async postAuthenticated<T>(endpoint: string, data?: any): Promise<T> {
    // Clear related cache entries on mutations
    this.clearCache(endpoint.split('/')[1]); // Clear cache for the resource
    
    return this.authenticatedRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async putAuthenticated<T>(endpoint: string, data?: any): Promise<T> {
    // Clear related cache entries on mutations
    this.clearCache(endpoint.split('/')[1]); // Clear cache for the resource
    
    return this.authenticatedRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async deleteAuthenticated<T>(endpoint: string): Promise<T> {
    // Clear related cache entries on mutations
    this.clearCache(endpoint.split('/')[1]); // Clear cache for the resource
    
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
