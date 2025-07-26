import express from 'express';
import { authenticate } from '../middleware/auth.js';
import CommunityPost from '../models/CommunityPost.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { body, validationResult } from 'express-validator';
import { communityCache, getCacheKey, invalidateCommunityCache } from '../utils/cache.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CommunityPost:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           $ref: '#/components/schemas/User'
 *         question:
 *           type: string
 *           maxLength: 1000
 *         category:
 *           type: string
 *           enum: [tech, business, social, health, education, entertainment, sports, other]
 *         likes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               createdAt:
 *                 type: string
 *         comments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               text:
 *                 type: string
 *               replies:
 *                 type: array
 *               createdAt:
 *                 type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

/**
 * @swagger
 * /api/community:
 *   post:
 *     tags: [Community]
 *     summary: Create a community post
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - category
 *             properties:
 *               question:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "What are the best practices for React development?"
 *               category:
 *                 type: string
 *                 enum: [tech, business, social, health, education, entertainment, sports, other]
 *                 example: "tech"
 *     responses:
 *       201:
 *         description: Community post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 post:
 *                   $ref: '#/components/schemas/CommunityPost'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Create community post
router.post('/', authenticate, [
  body('question').notEmpty().isLength({ max: 1000 }).withMessage('Question is required and max 1000 characters'),
  body('category').isIn(['tech', 'business', 'social', 'health', 'education', 'entertainment', 'sports', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { question, category } = req.body;

    const communityPost = new CommunityPost({
      userId: req.user._id,
      question,
      category
    });

    await communityPost.save();
    await communityPost.populate('userId', 'username profileImage');

    // Create notification for followers
    const user = await User.findById(req.user._id).select('followers username');
    if (user.followers.length > 0) {
      const notifications = user.followers.map(followerId => ({
        userId: followerId,
        fromUserId: req.user._id,
        type: 'post',
        message: `${user.username} asked a question in community`,
        postId: communityPost._id
      }));
      await Notification.insertMany(notifications);
    }

    // Invalidate community cache
    const cacheKey = getCacheKey('community', 'posts');
    communityCache.del(cacheKey);

    res.status(201).json({
      success: true,
      message: 'Community post created successfully',
      data: {
        post: communityPost
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
 * /api/community:
 *   get:
 *     tags: [Community]
 *     summary: Get all community posts with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, tech, business, social, health, education, entertainment, sports, other]
 *         description: Filter by category
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, popular]
 *           default: recent
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Community posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CommunityPost'
 *                     pagination:
 *                       type: object
 */
// Get all community posts
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, sort = 'recent' } = req.query;

    // Check cache first
    const cacheKey = getCacheKey('community', 'posts', `${page}-${limit}-${category}-${sort}`);
    const cachedData = communityCache.get(cacheKey);

    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    let query = { isActive: true };
    if (category && category !== 'all') {
      query.category = category;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') {
      // Sort by likes count (approximate)
      sortOption = { 'likes.length': -1, createdAt: -1 };
    }

    const posts = await CommunityPost.find(query)
      .populate('userId', 'username profileImage')
      .populate('likes.userId', 'username profileImage')
      .populate('comments.userId', 'username profileImage')
      .populate('comments.replies.userId', 'username profileImage')
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CommunityPost.countDocuments(query);

    // Add interaction status for current user
    const postsWithStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(like => like.userId._id.toString() === req.user._id.toString());
      postObj.likeCount = post.likes.length;
      postObj.commentCount = post.comments.length;

      // Check if saved
      const user = req.user;
      postObj.isSaved = user.savedCommunityPosts?.includes(post._id) || false;

      return postObj;
    });

    const responseData = {
      posts: postsWithStatus,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    };

    // Cache the response for 5 minutes
    communityCache.set(cacheKey, responseData, 300);

    res.json({
      success: true,
      data: responseData
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
 * /api/community/saved:
 *   get:
 *     tags: [Community]
 *     summary: Get user's saved community posts
 *     security:
 *       - bearerAuth: []
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Saved community posts retrieved successfully
 */
// Get user's saved community posts
router.get('/saved', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(req.user._id).select('savedCommunityPosts');

    if (!user.savedCommunityPosts || user.savedCommunityPosts.length === 0) {
      return res.json({
        success: true,
        data: {
          posts: [],
          pagination: {
            current: parseInt(page),
            pages: 0,
            total: 0
          }
        }
      });
    }

    const posts = await CommunityPost.find({
      _id: { $in: user.savedCommunityPosts },
      isActive: true
    })
      .populate('userId', 'username profileImage')
      .populate('likes.userId', 'username profileImage')
      .populate('comments.userId', 'username profileImage')
      .populate('comments.replies.userId', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CommunityPost.countDocuments({
      _id: { $in: user.savedCommunityPosts },
      isActive: true
    });

    // Add interaction status for current user
    const postsWithStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(like => like.userId._id.toString() === req.user._id.toString());
      postObj.likeCount = post.likes.length;
      postObj.commentCount = post.comments.length;
      postObj.isSaved = true; // All posts in this response are saved
      return postObj;
    });

    res.json({
      success: true,
      data: {
        posts: postsWithStatus,
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
 * /api/community/saved/{userId}:
 *   get:
 *     tags: [Community]
 *     summary: Get saved community posts by user ID (admin or self only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User's saved community posts retrieved successfully
 *       403:
 *         description: Access denied - can only view own saved posts
 */
// Get saved community posts by user ID
router.get('/saved/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if user is requesting their own saved posts
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own saved posts'
      });
    }

    const user = await User.findById(userId).select('savedCommunityPosts');

    if (!user.savedCommunityPosts || user.savedCommunityPosts.length === 0) {
      return res.json({
        success: true,
        data: {
          posts: [],
          pagination: {
            current: parseInt(page),
            pages: 0,
            total: 0
          }
        }
      });
    }

    const posts = await CommunityPost.find({
      _id: { $in: user.savedCommunityPosts },
      isActive: true
    })
      .populate('userId', 'username profileImage')
      .populate('likes.userId', 'username profileImage')
      .populate('comments.userId', 'username profileImage')
      .populate('comments.replies.userId', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CommunityPost.countDocuments({
      _id: { $in: user.savedCommunityPosts },
      isActive: true
    });

    // Add interaction status for current user
    const postsWithStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(like => like.userId._id.toString() === req.user._id.toString());
      postObj.likeCount = post.likes.length;
      postObj.commentCount = post.comments.length;
      postObj.isSaved = true; // All posts in this response are saved
      return postObj;
    });

    res.json({
      success: true,
      data: {
        posts: postsWithStatus,
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
 * /api/community/category/{category}:
 *   get:
 *     tags: [Community]
 *     summary: Get community posts by category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [tech, business, social, health, education, entertainment, sports, other]
 *         description: Category name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, popular]
 *           default: recent
 *     responses:
 *       200:
 *         description: Community posts by category retrieved successfully
 */
// Get community posts by category
router.get('/category/:category', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const { category } = req.params;

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') {
      sortOption = { 'likes.length': -1, createdAt: -1 };
    }

    const posts = await CommunityPost.find({
      category,
      isActive: true
    })
      .populate('userId', 'username profileImage')
      .populate('likes.userId', 'username profileImage')
      .populate('comments.userId', 'username profileImage')
      .populate('comments.replies.userId', 'username profileImage')
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CommunityPost.countDocuments({ category, isActive: true });

    // Add interaction status for current user
    const postsWithStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(like => like.userId._id.toString() === req.user._id.toString());
      postObj.likeCount = post.likes.length;
      postObj.commentCount = post.comments.length;

      const user = req.user;
      postObj.isSaved = user.savedCommunityPosts?.includes(post._id) || false;

      return postObj;
    });

    res.json({
      success: true,
      data: {
        posts: postsWithStatus,
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
 * /api/community/user/{userId}:
 *   get:
 *     tags: [Community]
 *     summary: Get community posts by user ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User's community posts retrieved successfully
 */
// Get community posts by user ID
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { userId } = req.params;

    const posts = await CommunityPost.find({
      userId,
      isActive: true
    })
      .populate('userId', 'username profileImage')
      .populate('likes.userId', 'username profileImage')
      .populate('comments.userId', 'username profileImage')
      .populate('comments.replies.userId', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CommunityPost.countDocuments({ userId, isActive: true });

    // Add interaction status for current user
    const postsWithStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(like => like.userId._id.toString() === req.user._id.toString());
      postObj.likeCount = post.likes.length;
      postObj.commentCount = post.comments.length;

      const user = req.user;
      postObj.isSaved = user.savedCommunityPosts?.includes(post._id) || false;

      return postObj;
    });

    res.json({
      success: true,
      data: {
        posts: postsWithStatus,
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
 * /api/community/{postId}:
 *   get:
 *     tags: [Community]
 *     summary: Get a specific community post by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community post ID
 *     responses:
 *       200:
 *         description: Community post retrieved successfully
 *       404:
 *         description: Post not found
 */
// Get community post by ID
router.get('/:postId', authenticate, async (req, res) => {
  try {
    const post = await CommunityPost.findOne({
      _id: req.params.postId,
      isActive: true
    })
      .populate('userId', 'username profileImage')
      .populate('likes.userId', 'username profileImage')
      .populate('comments.userId', 'username profileImage')
      .populate('comments.replies.userId', 'username profileImage');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const postObj = post.toObject();
    postObj.isLiked = post.likes.some(like => like.userId._id.toString() === req.user._id.toString());
    postObj.likeCount = post.likes.length;
    postObj.commentCount = post.comments.length;

    const user = req.user;
    postObj.isSaved = user.savedCommunityPosts?.includes(post._id) || false;

    res.json({
      success: true,
      data: {
        post: postObj
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
 * /api/community/{postId}/comments:
 *   get:
 *     tags: [Community]
 *     summary: Get all comments for a community post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community post ID
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
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 */
// Get all comments for a community post
router.get('/:postId/comments', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const post = await CommunityPost.findOne({
      _id: req.params.postId,
      isActive: true
    })
      .populate('comments.userId', 'username profileImage')
      .populate('comments.replies.userId', 'username profileImage');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Paginate comments
    const totalComments = post.comments.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedComments = post.comments.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        comments: paginatedComments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(totalComments / limit),
          total: totalComments
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
 * /api/community/{postId}/comment/{commentId}/replies:
 *   get:
 *     tags: [Community]
 *     summary: Get all replies for a specific comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community post ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Replies retrieved successfully
 */
// Get all replies for a specific comment
router.get('/:postId/comment/:commentId/replies', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const post = await CommunityPost.findOne({
      _id: req.params.postId,
      isActive: true
    })
      .populate('comments.replies.userId', 'username profileImage');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Paginate replies
    const totalReplies = comment.replies.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedReplies = comment.replies.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        replies: paginatedReplies,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(totalReplies / limit),
          total: totalReplies
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
 * /api/community/{postId}/like:
 *   post:
 *     tags: [Community]
 *     summary: Like or unlike a community post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community post ID
 *     responses:
 *       200:
 *         description: Post liked/unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 isLiked:
 *                   type: boolean
 *                 likeCount:
 *                   type: integer
 */
// Like community post
router.post('/:postId/like', authenticate, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
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
        data: {
          isLiked: false,
          likeCount: post.likes.length
        }
      });
    } else {
      // Like (only one like per user)
      post.likes.push({ userId: req.user._id });
      await post.save();

      // Create notification for post owner
      if (post.userId.toString() !== req.user._id.toString()) {
        const user = await User.findById(req.user._id).select('username');
        await new Notification({
          userId: post.userId,
          fromUserId: req.user._id,
          type: 'like',
          message: `${user.username} liked your community post`,
          postId: post._id
        }).save();
      }

      // Invalidate cache
      invalidateCommunityCache(post._id.toString());

      res.json({
        success: true,
        message: 'Post liked',
        data: {
          isLiked: true,
          likeCount: post.likes.length
        }
      });
    }
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
 * /api/community/{postId}/comment:
 *   post:
 *     tags: [Community]
 *     summary: Add a comment to a community post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Great question! Here's my perspective..."
 *     responses:
 *       200:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 comment:
 *                   type: object
 */
// Add comment to community post
router.post('/:postId/comment', authenticate, [
  body('text').notEmpty().isLength({ max: 500 }).withMessage('Comment text is required and max 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = {
      userId: req.user._id,
      text: req.body.text,
      replies: []
    };

    post.comments.push(comment);
    await post.save();

    // Create notification for post owner
    if (post.userId.toString() !== req.user._id.toString()) {
      const user = await User.findById(req.user._id).select('username');
      await new Notification({
        userId: post.userId,
        fromUserId: req.user._id,
        type: 'comment',
        message: `${user.username} commented on your community post`,
        postId: post._id
      }).save();
    }

    // Invalidate cache
    invalidateCommunityCache(post._id.toString());

    await post.populate('comments.userId', 'username profileImage');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment: post.comments[post.comments.length - 1]
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
 * /api/community/{postId}/comment/{commentId}/reply:
 *   post:
 *     tags: [Community]
 *     summary: Reply to a specific comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community post ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 500
 *                 example: "I agree with your point..."
 *     responses:
 *       200:
 *         description: Reply added successfully
 */
// Reply to comment
router.post('/:postId/comment/:commentId/reply', authenticate, [
  body('text').notEmpty().isLength({ max: 500 }).withMessage('Reply text is required and max 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const reply = {
      userId: req.user._id,
      text: req.body.text
    };

    comment.replies.push(reply);
    await post.save();

    // Create notification for comment owner and post owner
    const user = await User.findById(req.user._id).select('username');

    // Notify comment owner (if different from current user)
    if (comment.userId.toString() !== req.user._id.toString()) {
      await new Notification({
        userId: comment.userId,
        fromUserId: req.user._id,
        type: 'comment',
        message: `${user.username} replied to your comment`,
        postId: post._id
      }).save();
    }

    // Notify post owner (if different from current user and comment owner)
    if (post.userId.toString() !== req.user._id.toString() &&
      post.userId.toString() !== comment.userId.toString()) {
      await new Notification({
        userId: post.userId,
        fromUserId: req.user._id,
        type: 'comment',
        message: `${user.username} replied to a comment on your post`,
        postId: post._id
      }).save();
    }

    // Invalidate cache
    invalidateCommunityCache(post._id.toString());

    await post.populate('comments.replies.userId', 'username profileImage');

    res.json({
      success: true,
      message: 'Reply added successfully',
      data: {
        reply: comment.replies[comment.replies.length - 1]
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
 * /api/community/{postId}/save:
 *   post:
 *     tags: [Community]
 *     summary: Save or unsave a community post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community post ID
 *     responses:
 *       200:
 *         description: Post saved/unsaved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 isSaved:
 *                   type: boolean
 */
// Save/Unsave community post
router.post('/:postId/save', authenticate, async (req, res) => {
  try {
    const postId = req.params.postId;
    const user = await User.findById(req.user._id);

    const isSaved = user.savedCommunityPosts.includes(postId);

    if (isSaved) {
      // Unsave
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { savedCommunityPosts: postId }
      });

      res.json({
        success: true,
        message: 'Post unsaved',
        data: {
          isSaved: false
        }
      });
    } else {
      // Save
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { savedCommunityPosts: postId }
      });

      res.json({
        success: true,
        message: 'Post saved',
        data: {
          isSaved: true
        }
      });
    }
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
 * /api/community/{postId}:
 *   delete:
 *     tags: [Community]
 *     summary: Delete a community post (only creator can delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Community post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: Access denied - not the creator
 *       404:
 *         description: Post not found
 */
// Delete community post (only creator can delete)
router.delete('/:postId', authenticate, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user is the creator
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    await CommunityPost.findByIdAndDelete(req.params.postId);

    // Remove from all users' saved posts
    await User.updateMany(
      { savedCommunityPosts: req.params.postId },
      { $pull: { savedCommunityPosts: req.params.postId } }
    );

    // Invalidate cache
    invalidateCommunityCache(req.params.postId);

    res.json({
      success: true,
      message: 'Post deleted successfully'
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