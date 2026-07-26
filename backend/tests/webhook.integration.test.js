const crypto = require('crypto');
const http = require('http');
const express = require('express');

// Mock environment variables before requiring app
process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.BYPASS_AUTH = 'true';
process.env.FRONTEND_URL = 'http://localhost:5173';

// We need to test the actual webhook handling logic
// Since the server module starts listening, we'll test the webhook handler directly

// Mock the database
jest.mock('../src/db', () => ({
  query: jest.fn(),
  run: jest.fn(),
}));

// Mock the notifier
jest.mock('../src/notifier', () => ({
  notifyAll: jest.fn(),
}));

// Mock the logger
jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock the audit module
jest.mock('../src/audit', () => ({
  initAuditTable: jest.fn(),
  logAuditEvent: jest.fn(),
  getAuditLogs: jest.fn(),
}));

// Mock the triage module
jest.mock('../src/triage', () => ({
  triageFailure: jest.fn(),
}));

// Mock the LLM module
jest.mock('../src/llm', () => ({
  analyzeFailure: jest.fn(),
  getLLMConfig: jest.fn(),
}));

const db = require('../src/db');
const { notifyAll } = require('../src/notifier');
const { verifySignature, handleWebhook, computeMTTR } = require('../src/webhook');

describe('Webhook Integration Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      headers: {},
      rawBody: Buffer.from(''),
      params: {},
      body: {},
      ip: '127.0.0.1',
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('Webhook Signature Verification', () => {
    test('should accept valid HMAC-SHA256 signature', async () => {
      const secret = 'test-webhook-secret';
      const payload = JSON.stringify({ test: 'data' });
      
      process.env.GITHUB_WEBHOOK_SECRET = secret;
      req.rawBody = Buffer.from(payload);
      
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      req.headers['x-hub-signature-256'] = `sha256=${hmac.digest('hex')}`;

      await verifySignature(req, res, jest.fn());

      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject invalid signature', async () => {
      const secret = 'test-webhook-secret';
      process.env.GITHUB_WEBHOOK_SECRET = secret;
      req.rawBody = Buffer.from('test');
      req.headers['x-hub-signature-256'] = 'sha256=invalid';

      await verifySignature(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('Signatures did not match');
    });

    test('should skip verification when no secret configured', async () => {
      delete process.env.GITHUB_WEBHOOK_SECRET;
      req.headers['x-hub-signature-256'] = 'sha256=anything';

      const next = jest.fn();
      await verifySignature(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Event Processing', () => {
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
          html_url: 'https://github.com/test/repo/actions/runs/456',
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
      expect(notifyAll).toHaveBeenCalledWith(
        expect.objectContaining({
          repo_name: 'test/repo',
          workflow_name: 'CI',
          conclusion: 'failure',
        })
      );
    });

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

    test('should return 400 for invalid payload', async () => {
      req.headers['x-github-event'] = 'workflow_run';
      req.body = { action: 'completed' }; // Missing workflow_run and repository

      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Invalid payload');
    });

    test('should return 500 on database error', async () => {
      req.headers['x-github-event'] = 'workflow_run';
      req.body = {
        action: 'completed',
        workflow_run: {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/test/repo/actions/runs/789',
        },
        repository: {
          full_name: 'test/repo',
        },
      };
      req.tenant_id = null;

      db.run.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Database error');
    });
  });

  describe('MTTR Computation', () => {
    test('should compute MTTR when failure is recovered', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      db.query.mockResolvedValue({ rows: [{ created_at: fiveMinutesAgo }] });

      const mttr = await computeMTTR('test/repo', 'CI', null);

      expect(mttr).toBeGreaterThanOrEqual(299);
      expect(mttr).toBeLessThanOrEqual(301);
    });

    test('should return null when no previous failure exists', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const mttr = await computeMTTR('test/repo', 'CI', null);

      expect(mttr).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('DB error'));

      const mttr = await computeMTTR('test/repo', 'CI', null);

      expect(mttr).toBeNull();
    });
  });

  describe('Multi-Tenant Support', () => {
    test('should look up webhook secret for tenant in SaaS mode', async () => {
      process.env.SAAS_MODE = 'true';
      
      req.headers['x-github-event'] = 'workflow_run';
      req.params.tenant_id = '1';
      req.body = {
        action: 'completed',
        workflow_run: {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/test/repo/actions/runs/100',
        },
        repository: {
          full_name: 'test/repo',
        },
      };

      // Mock tenant lookup
      db.query.mockResolvedValueOnce({
        rows: [{ webhook_secret: 'tenant-secret' }],
      });

      // Mock event insertion
      db.run.mockImplementation((sql, params, callback) => {
        callback(null, {});
      });

      const hmac = crypto.createHmac('sha256', 'tenant-secret');
      hmac.update(req.rawBody.toString());
      req.headers['x-hub-signature-256'] = `sha256=${hmac.digest('hex')}`;

      await verifySignature(req, res, jest.fn());

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('webhook_secret'),
        expect.arrayContaining(['1'])
      );

      process.env.SAAS_MODE = 'false';
    });

    test('should require tenant_id in SaaS mode', async () => {
      process.env.SAAS_MODE = 'true';
      
      req.params.tenant_id = null;
      req.headers['x-hub-signature-256'] = 'sha256=anything';

      await verifySignature(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Tenant ID required for webhook in SaaS mode');

      process.env.SAAS_MODE = 'false';
    });
  });
});
