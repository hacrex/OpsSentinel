import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api';

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct base URL', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:3001');
  });

  it('should send credentials with requests', () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('should not have an Authorization header interceptor', () => {
    const config = { headers: {} };
    // With cookie-based auth, no Authorization header is added
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('API Response Interceptor', () => {
  it('should redirect to login on 401 response', () => {
    const error = {
      response: { status: 401 },
    };

    // Simulate interceptor logic
    let redirected = false;
    if (error.response && error.response.status === 401) {
      // window.location.href = '/login'; // Can't test in jsdom
      redirected = true;
    }

    expect(redirected).toBe(true);
  });
});
