import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Create post
router.post('/', authenticate, upload.array('media', 10), [
  body('description').optional().isLength({ max: 2000 }),
  body('type').isIn(['public', 'private', 'followers']).withMessage('Invalid post type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, type } = req.body;
    const media = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        media.push({
          type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          url: `/uploads/posts/${file.filename}`
        });
      });
    }

    const post = new Post({
      userId: req.user._id,
      description: description || '',
      media,
      type
    });

    await post.save();
    await post.populate('userId', 'username profileImage');

    // Create notification for followers
    if (type !== 'private') {
      const user = await User.findById(req.user._id).select('followers username');
      const notifications = user.followers.map(followerId => ({
        userId: followerId,
        fromUserId: req.user._id,
        type: 'post',
        message: `${user.username} shared a new post`,
        postId: post._id
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get home feed posts
router.get('/feed', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = await User.findById(req.user._id).select('following blockedUsers');

    // Get posts from followed users + suggested posts
    const posts = await Post.find({
      $and: [
        {
          $or: [
            { userId: { $in: user.following } },
            { type: 'public' }
          ]
        },
        { userId: { $nin: user.blockedUsers } },
        { isActive: true }
      ]
    })
    .populate('userId', 'username profileImage isVerified')
    .populate('likes.userId', 'username profileImage')
    .populate('comments.userId', 'username profileImage')
    .populate('comments.replies.userId', 'username profileImage')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Add interaction status for current user
    const postsWithStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(like => like.userId._id.toString() === req.user._id.toString());
      postObj.likeCount = post.likes.length;
      postObj.commentCount = post.comments.length;
      postObj.shareCount = post.shares.length;
      return postObj;
    });

    res.json({
      success: true,
      posts: postsWithStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get post by ID
router.get('/:postId', authenticate, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      isActive: true
    })
    .populate('userId', 'username profileImage isVerified')
    .populate('likes.userId', 'username profileImage')
    .populate('comments.userId', 'username profileImage')
    .populate('comments.replies.userId', 'username profileImage');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is blocked
    const user = await User.findById(req.user._id).select('blockedUsers');
    if (user.blockedUsers.includes(post.userId._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const postObj = post.toObject();
    postObj.isLiked = post.likes.some(like => like.userId._id.toString() === req.user._id.toString());
    postObj.likeCount = post.likes.length;
    postObj.commentCount = post.comments.length;
    postObj.shareCount = post.shares.length;

    res.json({
      success: true,
      post: postObj
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like/Unlike post
router.post('/:postId/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingLike = post.likes.find(like => 
      like.userId.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter(like => 
        like.userId.toString() !== req.user._id.toString()
      );
      await post.save();

      res.json({
        success: true,
        message: 'Post unliked',
        isLiked: false,
        likeCount: post.likes.length
      });
    } else {
      // Like
      post.likes.push({ userId: req.user._id });
      await post.save();

      // Create notification
      if (post.userId.toString() !== req.user._id.toString()) {
        const user = await User.findById(req.user._id).select('username');
        await new Notification({
          userId: post.userId,
          fromUserId: req.user._id,
          type: 'like',
          message: `${user.username} liked your post`,
          postId: post._id
        }).save();
      }

      res.json({
        success: true,
        message: 'Post liked',
        isLiked: true,
        likeCount: post.likes.length
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add comment
router.post('/:postId/comment', authenticate, [
  body('text').notEmpty().isLength({ max: 500 }).withMessage('Comment text is required and max 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      userId: req.user._id,
      text: req.body.text,
      likes: [],
      replies: []
    };

    post.comments.push(comment);
    await post.save();

    // Populate the new comment
    await post.populate('comments.userId', 'username profileImage');

    // Create notification
    if (post.userId.toString() !== req.user._id.toString()) {
      const user = await User.findById(req.user._id).select('username');
      await new Notification({
        userId: post.userId,
        fromUserId: req.user._id,
        type: 'comment',
        message: `${user.username} commented on your post`,
        postId: post._id
      }).save();
    }

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: post.comments[post.comments.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like comment
router.post('/:postId/comment/:commentId/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const existingLike = comment.likes.find(like => 
      like.userId.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      comment.likes = comment.likes.filter(like => 
        like.userId.toString() !== req.user._id.toString()
      );
    } else {
      // Like
      comment.likes.push({ userId: req.user._id });
    }

    await post.save();

    res.json({
      success: true,
      message: existingLike ? 'Comment unliked' : 'Comment liked',
      isLiked: !existingLike,
      likeCount: comment.likes.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Share post
router.post('/:postId/share', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingShare = post.shares.find(share => 
      share.userId.toString() === req.user._id.toString()
    );

    if (!existingShare) {
      post.shares.push({ userId: req.user._id });
      await post.save();
    }

    res.json({
      success: true,
      message: 'Post shared successfully',
      shareCount: post.shares.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Report post
router.post('/:postId/report', authenticate, [
  body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const Report = (await import('../models/Report.js')).default;
    
    const existingReport = await Report.findOne({
      reportedBy: req.user._id,
      reportedPost: req.params.postId
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this post' });
    }

    await new Report({
      reportedBy: req.user._id,
      reportedPost: req.params.postId,
      reason: req.body.reason,
      description: req.body.description
    }).save();

    res.json({
      success: true,
      message: 'Post reported successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;