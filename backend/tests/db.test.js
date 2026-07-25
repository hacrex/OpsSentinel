// Mock sqlite3 before requiring db module
jest.mock('sqlite3', () => ({
  verbose: jest.fn(() => ({
    Database: jest.fn().mockImplementation((path, callback) => {
      if (callback) callback(null);
      return {
        exec: jest.fn().mockImplementation((sql, callback) => {
          if (callback) callback(null);
        }),
        run: jest.fn().mockImplementation((sql, params, callback) => {
          if (callback) callback(null);
        }),
        all: jest.fn().mockImplementation((sql, params, callback) => {
          if (callback) callback(null, []);
        }),
        close: jest.fn(),
      };
    }),
  })),
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({}),
      release: jest.fn(),
    }),
    query: jest.fn().mockResolvedValue({ rows: [] }),
  })),
}));

jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Database Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should export a database object', () => {
    const db = require('../src/db');
    expect(db).toBeDefined();
    expect(typeof db.query).toBe('function');
  });

  test('should have query method that returns promise', async () => {
    const db = require('../src/db');
    const result = await db.query('SELECT 1 as test', []);
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
  });
});

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should warn when required env vars are missing', () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Clear module cache to re-run validation
    delete require.cache[require.resolve('../src/validateEnv')];
    const validateEnv = require('../src/validateEnv');
    validateEnv();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
