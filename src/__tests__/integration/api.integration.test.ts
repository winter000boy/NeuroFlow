import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/db.config';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany();
    await prisma.execution.deleteMany();
    await prisma.workflow.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany();
    await prisma.execution.deleteMany();
    await prisma.workflow.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          version: expect.any(String),
        },
      });
    });
  });

  describe('Authentication Flow', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    let accessToken: string;
    let refreshToken: string;

    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual({
        id: expect.any(String),
        email: testUser.email,
        name: testUser.name,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(response.body.data.accessToken).toBeDefined();
      
      // Extract tokens
      accessToken = response.body.data.accessToken;
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const refreshCookie = cookies.find((cookie: string) => cookie.startsWith('refreshToken='));
        if (refreshCookie) {
          refreshToken = refreshCookie.split('=')[1].split(';')[0];
        }
      }
    });

    it('should not register user with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should not access protected route without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Workflow Management', () => {
    let accessToken: string;
    let userId: string;

    beforeAll(async () => {
      // Create a test user and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'workflow-test@example.com',
          password: 'password123',
          name: 'Workflow Test User',
        });

      accessToken = registerResponse.body.data.accessToken;
      userId = registerResponse.body.data.user.id;
    });

    const testWorkflow = {
      name: 'Test Workflow',
      description: 'A test workflow',
      definition: {
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: 'trigger',
            position: [100, 200],
            parameters: {}
          }
        ],
        connections: {}
      },
    };

    let workflowId: string;

    it('should create a new workflow', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testWorkflow)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        id: expect.any(String),
        name: testWorkflow.name,
        description: testWorkflow.description,
        definition: testWorkflow.definition,
        status: 'DRAFT',
        userId,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      workflowId = response.body.data.id;
    });

    it('should get user workflows', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should get workflow by ID', async () => {
      const response = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(workflowId);
      expect(response.body.data.name).toBe(testWorkflow.name);
    });

    it('should update workflow', async () => {
      const updateData = {
        name: 'Updated Test Workflow',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should not access other user workflows', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other@example.com',
          password: 'password123',
          name: 'Other User',
        });

      const otherAccessToken = otherUserResponse.body.data.accessToken;

      // Try to access the first user's workflow
      const response = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should delete workflow', async () => {
      await request(app)
        .delete(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify workflow is deleted
      const response = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});