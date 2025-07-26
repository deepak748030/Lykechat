import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Report from '../models/Report.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Report user
router.post('/user', authenticate, [
  body('reportedUserId').notEmpty().withMessage('Reported user ID is required'),
  body('reason').isIn(['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'copyright', 'other']),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reportedUserId, reason, description } = req.body;

    // Check if already reported
    const existingReport = await Report.findOne({
      reportedBy: req.user._id,
      reportedUser: reportedUserId
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this user' });
    }

    const report = new Report({
      reportedBy: req.user._id,
      reportedUser: reportedUserId,
      reason,
      description
    });

    await report.save();

    res.json({
      success: true,
      message: 'User reported successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/reports/post:
 *   post:
 *     tags: [Reports]
 *     summary: Report a post
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportedPostId
 *               - reason
 *             properties:
 *               reportedPostId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum: [spam, harassment, inappropriate_content, fake_profile, copyright, other]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Post reported successfully
 */
// Report post
router.post('/post', authenticate, [
  body('reportedPostId').notEmpty().withMessage('Reported post ID is required'),
  body('reason').isIn(['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'copyright', 'other']),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reportedPostId, reason, description } = req.body;

    // Check if already reported
    const existingReport = await Report.findOne({
      reportedBy: req.user._id,
      reportedPost: reportedPostId
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this post' });
    }

    const report = new Report({
      reportedBy: req.user._id,
      reportedPost: reportedPostId,
      reason,
      description
    });

    await report.save();

    res.json({
      success: true,
      message: 'Post reported successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/reports/service:
 *   post:
 *     tags: [Reports]
 *     summary: Report a service
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportedServiceId
 *               - reason
 *             properties:
 *               reportedServiceId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum: [spam, harassment, inappropriate_content, fake_profile, copyright, other]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Service reported successfully
 */
// Report service
router.post('/service', authenticate, [
  body('reportedServiceId').notEmpty().withMessage('Reported service ID is required'),
  body('reason').isIn(['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'copyright', 'other']),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reportedServiceId, reason, description } = req.body;

    // Check if already reported
    const existingReport = await Report.findOne({
      reportedBy: req.user._id,
      reportedService: reportedServiceId
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this service' });
    }

    const report = new Report({
      reportedBy: req.user._id,
      reportedService: reportedServiceId,
      reason,
      description
    });

    await report.save();

    res.json({
      success: true,
      message: 'Service reported successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/reports/my-reports:
 *   get:
 *     tags: [Reports]
 *     summary: Get user's submitted reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 */
// Get user's reports (optional admin feature)
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const reports = await Report.find({ reportedBy: req.user._id })
      .populate('reportedUser', 'username profileImage')
      .populate('reportedPost', 'description')
      .populate('reportedService', 'serviceName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;