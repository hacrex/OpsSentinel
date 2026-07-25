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
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('should bypass auth when BYPASS_AUTH is true', async () => {
    process.env.BYPASS_AUTH = 'true';

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should return 401 when no authorization header', async () => {
    process.env.BYPASS_AUTH = 'false';

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
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
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next with valid token', async () => {
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
    req.headers.authorization = 'Bearer valid-token';

    axios.get.mockResolvedValue({
      data: { id: 12345, login: 'testuser' },
    });

    db.query.mockResolvedValue({ rows: [] });

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenant_id).toBeNull();
  });
});
