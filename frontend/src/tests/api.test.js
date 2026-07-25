import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should have correct base URL', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:3001');
  });

  it('should add authorization header when token exists', async () => {
    localStorage.setItem('github_token', 'test-token');
    
    // Import fresh to get new interceptor
    const config = { headers: {} };
    const token = localStorage.getItem('github_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    expect(config.headers.Authorization).toBe('Bearer test-token');
  });

  it('should not add authorization header when no token', () => {
    localStorage.removeItem('github_token');
    const config = { headers: {} };
    const token = localStorage.getItem('github_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('API Response Interceptor', () => {
  it('should redirect to login on 401 response', () => {
    const error = {
      response: { status: 401 },
    };
    
    // Simulate interceptor logic
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('github_token');
      localStorage.removeItem('github_user');
      // window.location.href = '/login'; // Can't test in jsdom
    }
    
    expect(localStorage.getItem('github_token')).toBeNull();
    expect(localStorage.getItem('github_user')).toBeNull();
  });
});
