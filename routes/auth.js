import express from 'express';
import { body, validationResult } from 'express-validator';
import { generateOtp, sendOtpViaSMS, verifyOtp } from '../utils/otpService.js';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { userCache, getCacheKey, invalidateUserCache } from '../utils/cache.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Send OTP to mobile number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobileNumber
 *             properties:
 *               mobileNumber:
 *                 type: string
 *                 pattern: '^[6-9]\d{9}$'
 *                 example: '9876543210'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid mobile number or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Send OTP
router.post('/send-otp', [
  body('mobileNumber')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid mobile number format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { mobileNumber } = req.body;
    const otp = generateOtp();
    
    const result = await sendOtpViaSMS(mobileNumber, otp);
    
    if (result.status) {
      res.json({
        success: true,
        message: 'OTP sent successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send OTP',
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
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify OTP and login/register
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobileNumber
 *               - otp
 *             properties:
 *               mobileNumber:
 *                 type: string
 *                 pattern: '^[6-9]\d{9}$'
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
// Verify OTP and Login/Register
router.post('/verify-otp', [
  body('mobileNumber')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid mobile number format'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { mobileNumber, otp } = req.body;
    
    if (!verifyOtp(mobileNumber, otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Check if user exists
    let user = await User.findOne({ mobileNumber });
    
    if (!user) {
      // Create new user
      const username = `user${mobileNumber.slice(-4)}${Date.now().toString().slice(-4)}`;
      user = new User({
        mobileNumber,
        username,
        isVerified: true
      });
      await user.save();
    } else {
      user.isVerified = true;
      await user.save();
    }

    // Invalidate user cache
    invalidateUserCache(user._id.toString());
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          mobileNumber: user.mobileNumber,
          profileImage: user.profileImage,
          isVerified: user.isVerified
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

export default router;