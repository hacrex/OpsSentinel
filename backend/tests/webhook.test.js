const crypto = require('crypto');

// Mock dependencies
jest.mock('../src/db', () => ({
  query: jest.fn(),
  run: jest.fn(),
}));

jest.mock('../src/notifier', () => ({
  notifyAll: jest.fn(),
}));

jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../src/db');
const { notifyAll } = require('../src/notifier');
const { verifySignature, handleWebhook, computeMTTR } = require('../src/webhook');

describe('Webhook Handler', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      rawBody: Buffer.from(''),
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('verifySignature', () => {
    test('should skip verification when no secret is configured', async () => {
      delete process.env.GITHUB_WEBHOOK_SECRET;
      req.headers['x-hub-signature-256'] = 'sha256=test';

      await verifySignature(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 when signature is missing', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      delete req.headers['x-hub-signature-256'];

      await verifySignature(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('No signature found');
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when signature does not match', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
      req.rawBody = Buffer.from('test-body');
      req.headers['x-hub-signature-256'] = 'sha256=invalid-signature';

      await verifySignature(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('Signatures did not match');
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next when signature is valid', async () => {
      const secret = 'test-secret';
      const body = 'test-body';
      process.env.GITHUB_WEBHOOK_SECRET = secret;

      req.rawBody = Buffer.from(body);
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(body);
      req.headers['x-hub-signature-256'] = `sha256=${hmac.digest('hex')}`;

      await verifySignature(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    test('should return pong for ping event', async () => {
      req.headers['x-github-event'] = 'ping';

      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('pong');
    });

    test('should ignore non-workflow_run events', async () => {
      req.headers['x-github-event'] = 'push';

      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('Event ignored');
    });

    test('should return 400 for invalid workflow_run payload', async () => {
      req.headers['x-github-event'] = 'workflow_run';
      req.body = { action: 'completed' };

      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Invalid payload');
    });

    test('should process completed workflow_run event', async () => {
      req.headers['x-github-event'] = 'workflow_run';
      req.body = {
        action: 'completed',
        workflow_run: {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/test/repo/actions/runs/123',
        },
        repository: {
          full_name: 'test/repo',
        },
      };
      req.tenant_id = null;

      db.run.mockImplementation((sql, params, callback) => {
        callback(null, {});
      });

      await handleWebhook(req, res);

      expect(db.run).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('Event processed');
    });

    test('should trigger notifications on failure', async () => {
      req.headers['x-github-event'] = 'workflow_run';
      req.body = {
        action: 'completed',
        workflow_run: {
          name: 'CI',
          status: 'completed',
          conclusion: 'failure',
          html_url: 'https://github.com/test/repo/actions/runs/123',
        },
        repository: {
          full_name: 'test/repo',
        },
      };
      req.tenant_id = null;

      db.run.mockImplementation((sql, params, callback) => {
        callback(null, {});
      });

      await handleWebhook(req, res);

      expect(notifyAll).toHaveBeenCalled();
    });

    test('should return 500 on database error', async () => {
      req.headers['x-github-event'] = 'workflow_run';
      req.body = {
        action: 'completed',
        workflow_run: {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/test/repo/actions/runs/123',
        },
        repository: {
          full_name: 'test/repo',
        },
      };
      req.tenant_id = null;

      db.run.mockImplementation((sql, params, callback) => {
        callback(new Error('DB error'), null);
      });

      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Database error');
    });
  });

  describe('computeMTTR', () => {
    test('should return null when no previous failure exists', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await computeMTTR('test/repo', 'CI', null);

      expect(result).toBeNull();
    });

    test('should calculate MTTR from last failure', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      db.query.mockResolvedValue({ rows: [{ created_at: fiveMinutesAgo }] });

      const result = await computeMTTR('test/repo', 'CI', null);

      expect(result).toBeGreaterThanOrEqual(299);
      expect(result).toBeLessThanOrEqual(301);
    });
  });
});
