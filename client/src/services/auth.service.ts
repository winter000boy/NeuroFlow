import {
  LoginCredentials,
  RegisterData,
  AuthTokens,
  AuthUser,
  ApiResponse,
} from '../types';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class AuthService {
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
    const token = this.getAccessToken();
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
          await this.refreshToken();
          // Retry the request with new token
          const newToken = this.getAccessToken();
          if (newToken) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            };
            return await this.request<T>(endpoint, config);
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and throw original error
          this.clearTokens();
          throw error;
        }
      }
      throw error;
    }
  }

  async login(
    credentials: LoginCredentials
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const response = await this.request<{ user: AuthUser; tokens: AuthTokens }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );

    // Store tokens
    this.setTokens(response.tokens);

    return response;
  }

  async register(
    data: RegisterData
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const response = await this.request<{ user: AuthUser; tokens: AuthTokens }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    // Store tokens
    this.setTokens(response.tokens);

    return response;
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokens = await this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    // Store new tokens
    this.setTokens(tokens);

    return tokens;
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.authenticatedRequest<AuthUser>('/auth/me');
  }

  logout(): void {
    this.clearTokens();
  }

  // Token management methods
  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const authService = new AuthService();
