import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-__v')
      .populate('followers', 'username profileImage')
      .populate('following', 'username profileImage');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-blockedUsers -__v')
      .populate('followers', 'username profileImage')
      .populate('following', 'username profileImage');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user is blocked
    if (user.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are blocked by this user' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update profile
router.put('/profile', authenticate, upload.single('profileImage'), [
  body('username').optional().isLength({ min: 3, max: 30 }),
  body('email').optional().isEmail(),
  body('bio').optional().isLength({ max: 150 }),
  body('location').optional().isLength({ max: 100 }),
  body('profession').optional().isLength({ max: 100 }),
  body('about').optional().isLength({ max: 500 }),
  body('website').optional().isURL(),
  body('instagramHandle').optional().isLength({ max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    // Check if username is unique
    if (updateData.username) {
      const existingUser = await User.findOne({ 
        username: updateData.username,
        _id: { $ne: req.user._id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Follow/Unfollow user
router.post('/:userId/follow', authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetUserId }
      });
      await User.findByIdAndUpdate(targetUserId, {
        $pull: { followers: currentUserId }
      });

      res.json({
        success: true,
        message: 'User unfollowed successfully',
        isFollowing: false
      });
    } else {
      // Follow
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: targetUserId }
      });
      await User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followers: currentUserId }
      });

      // Create notification
      const Notification = (await import('../models/Notification.js')).default;
      await new Notification({
        userId: targetUserId,
        fromUserId: currentUserId,
        type: 'follow',
        message: `${currentUser.username} started following you`
      }).save();

      res.json({
        success: true,
        message: 'User followed successfully',
        isFollowing: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's posts
router.get('/:userId/posts', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const posts = await Post.find({ 
      userId: req.params.userId,
      isActive: true
    })
    .select('-likes -comments -shares -reports')
    .populate('userId', 'username profileImage')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    res.json({
      success: true,
      posts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get followers
router.get('/:userId/followers', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'username profileImage bio')
      .select('followers');

    res.json({
      success: true,
      followers: user.followers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get following
router.get('/:userId/following', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'username profileImage bio')
      .select('following');

    res.json({
      success: true,
      following: user.following
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get suggested friends
router.get('/suggestions/friends', authenticate, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('following blockedUsers');
    
    const suggestions = await User.find({
      _id: { 
        $nin: [
          ...currentUser.following,
          ...currentUser.blockedUsers,
          req.user._id
        ]
      }
    })
    .select('username profileImage bio followers')
    .limit(10);

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Block/Unblock user
router.post('/:userId/block', authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    const isBlocked = currentUser.blockedUsers.includes(targetUserId);

    if (isBlocked) {
      // Unblock
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { blockedUsers: targetUserId }
      });

      res.json({
        success: true,
        message: 'User unblocked successfully',
        isBlocked: false
      });
    } else {
      // Block
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { blockedUsers: targetUserId }
      });

      // Remove from followers/following
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetUserId, followers: targetUserId }
      });
      await User.findByIdAndUpdate(targetUserId, {
        $pull: { following: currentUserId, followers: currentUserId }
      });

      res.json({
        success: true,
        message: 'User blocked successfully',
        isBlocked: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get blocked users
router.get('/blocked/users', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'username profileImage')
      .select('blockedUsers');

    res.json({
      success: true,
      blockedUsers: user.blockedUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;