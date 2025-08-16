import request from 'supertest';
import express from 'express';
import { healthCheck } from '../health.controller';

// Create Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.get('/health', healthCheck);
  return app;
};

describe('HealthController', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        uptime: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });

    it('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should return positive uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return ok status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });
});