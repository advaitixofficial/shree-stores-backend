import express from 'express';
import request from 'supertest';
import { idempotency } from '../src/middleware/idempotency';
import { IdempotencyKey } from '../src/models/IdempotencyKey';

describe('Idempotency Concurrency Guard Middleware Tests', () => {
  let app: express.Express;
  let requestCount: number;

  beforeEach(() => {
    requestCount = 0;
    app = express();
    app.use(express.json());

    // Setup dummy route with idempotency middleware
    app.post(
      '/test-checkout',
      idempotency,
      async (req, res) => {
        requestCount++;
        // Simulate some database/network processing delay (50ms)
        await new Promise((resolve) => setTimeout(resolve, 50));
        res.status(201).json({ success: true, count: requestCount, data: req.body });
      }
    );

    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({ error: err.message });
    });
  });

  test('Should allow single request and return cached response on subsequent calls', async () => {
    const key = 'idem-key-1';

    // First request
    const res1 = await request(app)
      .post('/test-checkout')
      .set('Idempotency-Key', key)
      .send({ amount: 100 });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.count).toBe(1);

    // Second request (should fetch cache without invoking handler)
    const res2 = await request(app)
      .post('/test-checkout')
      .set('Idempotency-Key', key)
      .send({ amount: 100 });

    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
    expect(res2.body.count).toBe(1); // Handler not invoked, so count remains 1

    expect(requestCount).toBe(1);
  });

  test('Should block concurrent requests with same key returning 409 Conflict', async () => {
    const key = 'idem-key-2';

    // Fire 2 concurrent requests
    const [res1, res2] = await Promise.all([
      request(app).post('/test-checkout').set('Idempotency-Key', key).send({ amount: 100 }),
      request(app).post('/test-checkout').set('Idempotency-Key', key).send({ amount: 100 }),
    ]);

    // One must succeed with 210, the other must fail with 409 Conflict
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const errorResponse = res1.status === 409 ? res1.body : res2.body;
    expect(errorResponse.success).toBe(false);
    expect(errorResponse.message).toContain('already in progress');
  });

  test('Should clean up database key lock if route handler crashes', async () => {
    const key = 'idem-key-3';

    // Create a route that throws
    app.post(
      '/test-crash',
      idempotency,
      (req, res, next) => {
        next(new Error('Handler crashed'));
      }
    );

    const res1 = await request(app)
      .post('/test-crash')
      .set('Idempotency-Key', key)
      .send();

    expect(res1.status).toBe(500);

    // Verify key was cleaned up and doesn't exist in DB
    const stored = await IdempotencyKey.findOne({ key });
    expect(stored).toBeNull();
  });
});
