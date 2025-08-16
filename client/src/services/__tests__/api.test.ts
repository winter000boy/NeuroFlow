import { ApiService } from '../api';
import { authService } from '../auth.service';
import { store } from '../../store';
import { clearCredentials } from '../../store/slices/authSlice';

// Mock the auth service
jest.mock('../auth.service');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock the store
jest.mock('../../store');
const mockStore = store as jest.Mocked<typeof store>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    apiService = new ApiService('http://localhost:3000/api');
  });

  describe('Public endpoints', () => {
    it('should make GET request successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'Hello World' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiService.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual({ message: 'Hello World' });
    });

    it('should make POST request successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { id: '123' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const postData = { name: 'Test' };
      const result = await apiService.post('/test', postData);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      expect(result).toEqual({ id: '123' });
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: { message: 'Bad Request' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiService.get('/test')).rejects.toThrow('Bad Request');
    });

    it('should handle API response errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: { message: 'API Error' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(apiService.get('/test')).rejects.toThrow('API Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'));

      await expect(apiService.get('/test')).rejects.toThrow('Network Error');
    });
  });

  describe('Authenticated endpoints', () => {
    it('should make authenticated GET request successfully', async () => {
      mockAuthService.getAccessToken.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'Authenticated data' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiService.getAuthenticated('/protected');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/protected', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });
      expect(result).toEqual({ message: 'Authenticated data' });
    });

    it('should throw error when no access token available', async () => {
      mockAuthService.getAccessToken.mockReturnValue(null);

      await expect(apiService.getAuthenticated('/protected')).rejects.toThrow(
        'No access token available'
      );
    });

    it('should refresh token and retry on 401 error', async () => {
      mockAuthService.getAccessToken
        .mockReturnValueOnce('expired-token')
        .mockReturnValueOnce('new-token');

      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          error: { message: 'Unauthorized' },
        }),
      };

      const mockSuccessResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'Success after refresh' },
        }),
      };

      mockFetch
        .mockResolvedValueOnce(mockErrorResponse as any)
        .mockResolvedValueOnce(mockSuccessResponse as any);

      mockAuthService.refreshToken.mockResolvedValue(undefined);

      const result = await apiService.getAuthenticated('/protected');

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Success after refresh' });
    });

    it('should clear tokens and throw error when refresh fails', async () => {
      mockAuthService.getAccessToken.mockReturnValue('expired-token');
      mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          error: { message: 'Unauthorized' },
        }),
      };

      mockFetch.mockResolvedValue(mockErrorResponse as any);

      await expect(apiService.getAuthenticated('/protected')).rejects.toThrow('Unauthorized');

      expect(mockAuthService.clearTokens).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(clearCredentials());
    });

    it('should make authenticated POST request', async () => {
      mockAuthService.getAccessToken.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { id: '123' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const postData = { name: 'Test' };
      const result = await apiService.postAuthenticated('/protected', postData);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/protected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(postData),
      });
      expect(result).toEqual({ id: '123' });
    });

    it('should make authenticated PUT request', async () => {
      mockAuthService.getAccessToken.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { updated: true },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const putData = { name: 'Updated' };
      const result = await apiService.putAuthenticated('/protected/123', putData);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/protected/123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(putData),
      });
      expect(result).toEqual({ updated: true });
    });

    it('should make authenticated DELETE request', async () => {
      mockAuthService.getAccessToken.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { deleted: true },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiService.deleteAuthenticated('/protected/123');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/protected/123', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('Legacy methods', () => {
    it('should support legacy put method', async () => {
      mockAuthService.getAccessToken.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { updated: true },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiService.put('/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ data: 'test' }),
      });
      expect(result).toEqual({ updated: true });
    });

    it('should support legacy delete method', async () => {
      mockAuthService.getAccessToken.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { deleted: true },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await apiService.delete('/test');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('Custom base URL', () => {
    it('should use custom base URL', async () => {
      const customApiService = new ApiService('https://api.example.com');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'Custom API' },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await customApiService.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.any(Object));
    });
  });
});