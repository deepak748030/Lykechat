import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import Story from '../models/Story.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Story:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           $ref: '#/components/schemas/User'
 *         media:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [image, video]
 *             url:
 *               type: string
 *             thumbnail:
 *               type: string
 *         viewers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               viewedAt:
 *                 type: string
 *         expiresAt:
 *           type: string
 *         createdAt:
 *           type: string
 */

/**
 * @swagger
 * /api/stories:
 *   post:
 *     tags: [Stories]
 *     summary: Create a new story
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - media
 *             properties:
 *               media:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file
 *     responses:
 *       201:
 *         description: Story created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 story:
 *                   $ref: '#/components/schemas/Story'
 */
// Create story
router.post('/', authenticate, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Media file is required' });
    }

    const story = new Story({
      userId: req.user._id,
      media: {
        type: req.file.mimetype.startsWith('image/') ? 'image' : 'video',
        url: `/uploads/stories/${req.file.filename}`
      }
    });

    await story.save();
    await story.populate('userId', 'username profileImage');

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/stories/feed:
 *   get:
 *     tags: [Stories]
 *     summary: Get stories from following users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stories feed retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         $ref: '#/components/schemas/User'
 *                       stories:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Story'
 */
// Get stories from following users
router.get('/feed', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('following blockedUsers');

    const stories = await Story.find({
      userId: {
        $in: user.following,
        $nin: user.blockedUsers
      },
      expiresAt: { $gt: new Date() }
    })
      .populate('userId', 'username profileImage')
      .populate('viewers.userId', 'username profileImage')
      .sort({ createdAt: -1 });

    // Group stories by user
    const groupedStories = {};
    stories.forEach(story => {
      const userId = story.userId._id.toString();
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          user: story.userId,
          stories: []
        };
      }
      groupedStories[userId].stories.push(story);
    });

    res.json({
      success: true,
      stories: Object.values(groupedStories)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/stories/my-stories:
 *   get:
 *     tags: [Stories]
 *     summary: Get current user's stories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User stories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Story'
 */
// Get my stories
router.get('/my-stories', authenticate, async (req, res) => {
  try {
    const stories = await Story.find({
      userId: req.user._id,
      expiresAt: { $gt: new Date() }
    })
      .populate('viewers.userId', 'username profileImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      stories
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// View story
router.post('/:storyId/view', authenticate, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user can view this story (must be following the story owner)
    const storyOwner = await User.findById(story.userId).select('followers');
    if (!storyOwner.followers.includes(req.user._id) && story.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if already viewed
    const existingView = story.viewers.find(viewer =>
      viewer.userId.toString() === req.user._id.toString()
    );

    if (!existingView) {
      story.viewers.push({ userId: req.user._id });
      await story.save();
    }

    res.json({
      success: true,
      message: 'Story viewed successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/stories/{storyId}/viewers:
 *   get:
 *     tags: [Stories]
 *     summary: Get story viewers (only story owner can access)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *     responses:
 *       200:
 *         description: Story viewers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 viewers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         $ref: '#/components/schemas/User'
 *                       viewedAt:
 *                         type: string
 */
// Get story viewers
router.get('/:storyId/viewers', authenticate, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('viewers.userId', 'username profileImage');

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Only story owner can see viewers
    if (story.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      viewers: story.viewers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;