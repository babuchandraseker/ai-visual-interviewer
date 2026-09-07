import request from 'supertest';
import { createApp } from '../src/app';
import * as dbService from '../src/services/db';

const app = createApp();

describe('Health API Endpoint', () => {
  it('GET /health should return 200 when database is connected', async () => {
    jest.spyOn(dbService, 'checkDatabaseConnection').mockResolvedValueOnce(true);

    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      database: 'connected'
    });
  });

  it('GET /health should return 503 when database is disconnected', async () => {
    jest.spyOn(dbService, 'checkDatabaseConnection').mockResolvedValueOnce(false);

    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'degraded',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      database: 'disconnected'
    });
  });

  it('GET /api/v1/invalid-route should return 404', async () => {
    const response = await request(app).get('/api/v1/invalid-route');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('Cannot find endpoint')
      }
    });
  });
});
