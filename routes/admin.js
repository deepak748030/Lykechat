import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateAdmin, generateAdminToken } from '../middleware/adminAuth.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Service from '../models/Service.js';
import Report from '../models/Report.js';
import { userCache, getCacheKey, clearAllCache } from '../utils/cache.js';

const router = express.Router();

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     tags: [Admin]
 *     summary: Admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateAdminToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          permissions: admin.permissions
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard statistics
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const cacheKey = getCacheKey('admin', 'dashboard');
    const cachedData = userCache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Get statistics
    const [
      totalUsers,
      totalPosts,
      totalServices,
      totalReports,
      activeUsers,
      recentUsers,
      recentPosts,
      pendingReports
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ isActive: true }),
      Service.countDocuments({ isActive: true }),
      Report.countDocuments(),
      User.countDocuments({ isOnline: true }),
      User.find().sort({ createdAt: -1 }).limit(5).select('username profileImage createdAt'),
      Post.find({ isActive: true }).sort({ createdAt: -1 }).limit(5)
        .populate('userId', 'username profileImage').select('description media createdAt'),
      Report.find({ status: 'pending' }).limit(10)
        .populate('reportedBy', 'username')
        .populate('reportedUser', 'username')
        .populate('reportedPost', 'description')
    ]);

    const dashboardData = {
      statistics: {
        totalUsers,
        totalPosts,
        totalServices,
        totalReports,
        activeUsers
      },
      recentActivity: {
        users: recentUsers,
        posts: recentPosts
      },
      pendingReports
    };

    // Cache for 5 minutes
    userCache.set(cacheKey, dashboardData, 300);

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users with pagination
 *     security:
 *       - adminAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { mobileNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-blockedUsers -savedPosts -savedCommunityPosts')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/toggle-status:
 *   patch:
 *     tags: [Admin]
 *     summary: Toggle user active status
 *     security:
 *       - adminAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.patch('/users/:userId/toggle-status', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle isVerified status (using as active/inactive)
    user.isVerified = !user.isVerified;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isVerified ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: user.isVerified }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/posts:
 *   get:
 *     tags: [Admin]
 *     summary: Get all posts with pagination
 *     security:
 *       - adminAuth: []
 */
router.get('/posts', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const posts = await Post.find()
      .populate('userId', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments();

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/posts/{postId}/toggle-status:
 *   patch:
 *     tags: [Admin]
 *     summary: Toggle post active status
 *     security:
 *       - adminAuth: []
 */
router.patch('/posts/:postId/toggle-status', authenticateAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.isActive = !post.isActive;
    await post.save();

    res.json({
      success: true,
      message: `Post ${post.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: post.isActive }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: Get all reports
 *     security:
 *       - adminAuth: []
 */
router.get('/reports', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const reports = await Report.find(query)
      .populate('reportedBy', 'username profileImage')
      .populate('reportedUser', 'username profileImage')
      .populate('reportedPost', 'description')
      .populate('reportedService', 'serviceName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/reports/{reportId}/update-status:
 *   patch:
 *     tags: [Admin]
 *     summary: Update report status
 *     security:
 *       - adminAuth: []
 */
router.patch('/reports/:reportId/update-status', authenticateAdmin, [
  body('status').isIn(['pending', 'reviewed', 'resolved', 'dismissed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { status: req.body.status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report status updated successfully',
      data: report
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/admin/cache/clear:
 *   post:
 *     tags: [Admin]
 *     summary: Clear all cache
 *     security:
 *       - adminAuth: []
 */
router.post('/cache/clear', authenticateAdmin, async (req, res) => {
  try {
    clearAllCache();
    
    res.json({
      success: true,
      message: 'All cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

export default router;