import express from 'express';
import { authenticate } from '../middleware/auth.js';
import CommunityPost from '../models/CommunityPost.js';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';

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
      return res.status(400).json({ errors: errors.array() });
    }

    const { question, category } = req.body;

    const communityPost = new CommunityPost({
      userId: req.user._id,
      question,
      category
    });

    await communityPost.save();
    await communityPost.populate('userId', 'username profileImage');

    res.status(201).json({
      success: true,
      message: 'Community post created successfully',
      post: communityPost
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get community posts
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, sort = 'recent' } = req.query;

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

    res.json({
      success: true,
      posts: postsWithStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
      // Like (only one like per user)
      post.likes.push({ userId: req.user._id });
      await post.save();

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
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      userId: req.user._id,
      text: req.body.text,
      replies: []
    };

    post.comments.push(comment);
    await post.save();

    await post.populate('comments.userId', 'username profileImage');

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: post.comments[post.comments.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reply to comment
router.post('/:postId/comment/:commentId/reply', authenticate, [
  body('text').notEmpty().isLength({ max: 500 }).withMessage('Reply text is required and max 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = {
      userId: req.user._id,
      text: req.body.text
    };

    comment.replies.push(reply);
    await post.save();

    await post.populate('comments.replies.userId', 'username profileImage');

    res.json({
      success: true,
      message: 'Reply added successfully',
      reply: comment.replies[comment.replies.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
        isSaved: false
      });
    } else {
      // Save
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { savedCommunityPosts: postId }
      });

      res.json({
        success: true,
        message: 'Post saved',
        isSaved: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the creator
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await CommunityPost.findByIdAndDelete(req.params.postId);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;