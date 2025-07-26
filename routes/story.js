import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import Story from '../models/Story.js';
import User from '../models/User.js';

const router = express.Router();

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