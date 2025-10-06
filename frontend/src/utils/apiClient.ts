import { getApiUrl } from '../config/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiUrl();
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('adminToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();
    
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Try to refresh token first
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request with new token
          throw new Error('TOKEN_REFRESHED');
        } else {
          // Clear stored auth data and redirect to login
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userName');
          
          // Redirect to login page
          window.location.href = '/';
          throw new Error('Authentication required');
        }
      }
      
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('PUT request failed:', error);
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('adminToken');
    if (!token) return false;

    try {
      // Basic token validation (check if it's not expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  // Check if token is about to expire (within 5 minutes)
  isTokenExpiringSoon(): boolean {
    const token = localStorage.getItem('adminToken');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;
      return timeUntilExpiry < 300; // 5 minutes
    } catch {
      return true;
    }
  }

  // Refresh token by re-authenticating
  async refreshToken(): Promise<boolean> {
    try {
      const email = localStorage.getItem('adminEmail');
      const password = 'tech123'; // In production, this should be stored securely or re-prompted
      
      if (!email) return false;

      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminEmail', data.email);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userName', data.name);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Get current user info from token
  getCurrentUser(): { email: string; role: string; name: string } | null {
    const token = localStorage.getItem('adminToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        email: payload.email,
        role: payload.role,
        name: payload.name,
      };
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
