const axios = require('axios');

// Mock dependencies
jest.mock('axios');
jest.mock('../src/db', () => ({
  query: jest.fn(),
}));
jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../src/db');
const { authMiddleware } = require('../src/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BYPASS_AUTH = 'false';
    req = {
      headers: {},
      cookies: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('should bypass auth when BYPASS_AUTH is true', async () => {
    process.env.BYPASS_AUTH = 'true';

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should return 401 when no token in cookie or header', async () => {
    process.env.BYPASS_AUTH = 'false';

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when authorization header is invalid format', async () => {
    process.env.BYPASS_AUTH = 'false';
    req.headers.authorization = 'InvalidFormat';

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when GitHub token is invalid', async () => {
    process.env.BYPASS_AUTH = 'false';
    req.headers.authorization = 'Bearer invalid-token';

    axios.get.mockRejectedValue(new Error('Unauthorized'));

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired GitHub token' });
    expect(res.clearCookie).toHaveBeenCalledWith('github_token', { path: '/' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should read token from cookie preferentially', async () => {
    process.env.BYPASS_AUTH = 'false';
    req.cookies.github_token = 'cookie-token';
    req.headers.authorization = 'Bearer header-token';

    axios.get.mockResolvedValue({
      data: { id: 12345, login: 'testuser' },
    });

    db.query.mockResolvedValue({
      rows: [{ tenant_id: 1 }],
    });

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.token).toBe('cookie-token');
    expect(req.tenant_id).toBe(1);
    expect(axios.get).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: { Authorization: 'Bearer cookie-token' },
      })
    );
  });

  test('should call next with valid token from header', async () => {
    process.env.BYPASS_AUTH = 'false';
    req.headers.authorization = 'Bearer valid-token';

    axios.get.mockResolvedValue({
      data: { id: 12345, login: 'testuser' },
    });

    db.query.mockResolvedValue({
      rows: [{ tenant_id: 1 }],
    });

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.token).toBe('valid-token');
    expect(req.tenant_id).toBe(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should set tenant_id to null when user not in DB', async () => {
    process.env.BYPASS_AUTH = 'false';
    req.headers.authorization = 'Bearer another-valid-token';

    axios.get.mockResolvedValue({
      data: { id: 67890, login: 'otheruser' },
    });

    db.query.mockResolvedValue({ rows: [] });

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenant_id).toBeNull();
  });
});
