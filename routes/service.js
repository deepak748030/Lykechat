import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import Service from '../models/Service.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * /api/services:
 *   post:
 *     tags: [Services]
 *     summary: Create a new service
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - serviceName
 *               - about
 *               - address
 *               - minAmount
 *               - maxAmount
 *               - category
 *             properties:
 *               serviceName:
 *                 type: string
 *                 maxLength: 100
 *               about:
 *                 type: string
 *                 maxLength: 1000
 *               address:
 *                 type: string
 *                 maxLength: 200
 *               mobileNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *               minAmount:
 *                 type: number
 *               maxAmount:
 *                 type: number
 *               homeServiceAvailable:
 *                 type: boolean
 *               category:
 *                 type: string
 *                 enum: [tech, business, health, education, food, beauty, fitness, repair, cleaning, other]
 *               schedule:
 *                 type: string
 *                 description: JSON string of schedule array
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Service created successfully
 */
// Create service
router.post('/', authenticate, upload.array('images', 10), [
  body('serviceName').notEmpty().isLength({ max: 100 }).withMessage('Service name is required and max 100 characters'),
  body('about').notEmpty().isLength({ max: 1000 }).withMessage('About is required and max 1000 characters'),
  body('address').notEmpty().isLength({ max: 200 }).withMessage('Address is required and max 200 characters'),
  body('minAmount').isNumeric().withMessage('Minimum amount must be a number'),
  body('maxAmount').isNumeric().withMessage('Maximum amount must be a number'),
  body('category').isIn(['tech', 'business', 'health', 'education', 'food', 'beauty', 'fitness', 'repair', 'cleaning', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      serviceName,
      about,
      address,
      mobileNumbers,
      minAmount,
      maxAmount,
      homeServiceAvailable,
      category,
      schedule
    } = req.body;

    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push(`/uploads/services/${file.filename}`);
      });
    }

    const service = new Service({
      userId: req.user._id,
      serviceName,
      about,
      images,
      address,
      mobileNumbers: Array.isArray(mobileNumbers) ? mobileNumbers : [mobileNumbers].filter(Boolean),
      minAmount: parseFloat(minAmount),
      maxAmount: parseFloat(maxAmount),
      homeServiceAvailable: homeServiceAvailable === 'true',
      category,
      schedule: schedule ? JSON.parse(schedule) : []
    });

    await service.save();
    await service.populate('userId', 'username profileImage');

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/services/{serviceId}:
 *   put:
 *     tags: [Services]
 *     summary: Update a service (only owner can update)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               serviceName:
 *                 type: string
 *               about:
 *                 type: string
 *               address:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Service updated successfully
 */
// Update service
router.put('/:serviceId', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if user is the owner
    if (service.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update your own services' });
    }

    const updateData = { ...req.body };

    if (req.files && req.files.length > 0) {
      const newImages = [];
      req.files.forEach(file => {
        newImages.push(`/uploads/services/${file.filename}`);
      });
      updateData.images = [...service.images, ...newImages];
    }

    if (updateData.schedule) {
      updateData.schedule = JSON.parse(updateData.schedule);
    }

    if (updateData.mobileNumbers) {
      updateData.mobileNumbers = Array.isArray(updateData.mobileNumbers)
        ? updateData.mobileNumbers
        : [updateData.mobileNumbers].filter(Boolean);
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.serviceId,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'username profileImage');

    res.json({
      success: true,
      message: 'Service updated successfully',
      service: updatedService
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/services:
 *   get:
 *     tags: [Services]
 *     summary: Get all services with filtering and pagination
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, tech, business, health, education, food, beauty, fitness, repair, cleaning, other]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Services retrieved successfully
 */
// Get all services
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;

    let query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const services = await Service.find(query)
      .populate('userId', 'username profileImage')
      .select('serviceName rating address mobileNumbers images category')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      services
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get service by ID
router.get('/:serviceId', async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.serviceId,
      isActive: true
    })
      .populate('userId', 'username profileImage mobileNumber isOnline lastSeen')
      .populate('reviews.userId', 'username profileImage');

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({
      success: true,
      service
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/services/search/query:
 *   get:
 *     tags: [Services]
 *     summary: Search services with advanced filters
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
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
 *         description: Search results retrieved successfully
 */
// Search services
router.get('/search/query', async (req, res) => {
  try {
    const { q, category, location, page = 1, limit = 10 } = req.query;

    let query = { isActive: true };

    if (q) {
      query.$or = [
        { serviceName: { $regex: q, $options: 'i' } },
        { about: { $regex: q, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (location) {
      query.address = { $regex: location, $options: 'i' };
    }

    const services = await Service.find(query)
      .populate('userId', 'username profileImage')
      .select('serviceName rating address mobileNumbers images category')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      services
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/services/trending/categories:
 *   get:
 *     tags: [Services]
 *     summary: Get trending service categories
 *     responses:
 *       200:
 *         description: Trending categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       count:
 *                         type: integer
 */
// Get trending service categories
router.get('/trending/categories', async (req, res) => {
  try {
    const trendingCategories = await Service.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { category: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      categories: trendingCategories
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/services/category/{category}:
 *   get:
 *     tags: [Services]
 *     summary: Get services by category
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [tech, business, health, education, food, beauty, fitness, repair, cleaning, other]
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
 *         description: Services by category retrieved successfully
 */
// Get services by category
router.get('/category/:category', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const services = await Service.find({
      category: req.params.category,
      isActive: true
    })
      .populate('userId', 'username profileImage')
      .select('serviceName rating address mobileNumbers images category')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      services
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/services/{serviceId}/review:
 *   post:
 *     tags: [Services]
 *     summary: Add a review to a service
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               text:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Review added successfully
 */
// Add review
router.post('/:serviceId/review', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('text').optional().isLength({ max: 500 }).withMessage('Review text max 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if user already reviewed
    const existingReview = service.reviews.find(review =>
      review.userId.toString() === req.user._id.toString()
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this service' });
    }

    const { rating, text } = req.body;

    const review = {
      userId: req.user._id,
      rating,
      text: text || ''
    };

    service.reviews.push(review);

    // Update rating average
    const totalRating = service.reviews.reduce((sum, review) => sum + review.rating, 0);
    service.rating.average = totalRating / service.reviews.length;
    service.rating.count = service.reviews.length;

    await service.save();

    // Populate the new review
    await service.populate('reviews.userId', 'username profileImage');

    res.json({
      success: true,
      message: 'Review added successfully',
      review: service.reviews[service.reviews.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;