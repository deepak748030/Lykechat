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