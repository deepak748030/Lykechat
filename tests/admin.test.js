import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Admin from '../models/Admin.js';
import { generateAdminToken } from '../middleware/adminAuth.js';

describe('Admin Routes', () => {
  let adminToken;
  let testAdmin;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/lykechat_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await Admin.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Admin.deleteMany({});
    
    // Create test admin
    testAdmin = new Admin({
      email: 'admin@test.com',
      password: 'password123',
      name: 'Test Admin',
      role: 'admin',
      permissions: ['users', 'posts']
    });
    await testAdmin.save();
    
    adminToken = generateAdminToken(testAdmin._id);
  });

  describe('POST /api/admin/login', () => {
    it('should login admin with valid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard data for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});