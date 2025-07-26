import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import { io } from '../server.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Chat:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         messages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               senderId:
 *                 type: string
 *               text:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image, video, document]
 *               media:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [sent, delivered, seen]
 *               createdAt:
 *                 type: string
 *         lastMessage:
 *           type: object
 *         unreadCount:
 *           type: array
 */

/**
 * @swagger
 * /api/chat/start:
 *   post:
 *     tags: [Chat]
 *     summary: Start or get existing chat with a user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *             properties:
 *               recipientId:
 *                 type: string
 *                 description: ID of the user to chat with
 *     responses:
 *       200:
 *         description: Chat retrieved or created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 chat:
 *                   $ref: '#/components/schemas/Chat'
 */
// Get or create chat
router.post('/start', authenticate, [
  body('recipientId').notEmpty().withMessage('Recipient ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientId } = req.body;
    const senderId = req.user._id;

    if (recipientId === senderId.toString()) {
      return res.status(400).json({ message: 'Cannot start chat with yourself' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [senderId, recipientId] }
    }).populate('participants', 'username profileImage isOnline lastSeen');

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [senderId, recipientId],
        messages: [],
        unreadCount: [
          { userId: senderId, count: 0 },
          { userId: recipientId, count: 0 }
        ]
      });
      await chat.save();
      await chat.populate('participants', 'username profileImage isOnline lastSeen');
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/chat:
 *   get:
 *     tags: [Chat]
 *     summary: Get user's chats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 chats:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chat'
 */
// Get user's chats
router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
      .populate('participants', 'username profileImage isOnline lastSeen')
      .populate('lastMessage.senderId', 'username profileImage')
      .sort({ 'lastMessage.timestamp': -1 });

    // Filter out current user from participants and add unread count
    const chatsWithDetails = chats.map(chat => {
      const chatObj = chat.toObject();
      chatObj.otherParticipant = chatObj.participants.find(p =>
        p._id.toString() !== req.user._id.toString()
      );
      chatObj.unreadCount = chatObj.unreadCount.find(uc =>
        uc.userId.toString() === req.user._id.toString()
      )?.count || 0;
      return chatObj;
    });

    res.json({
      success: true,
      chats: chatsWithDetails
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/chat/{chatId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get chat messages with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
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
 *           default: 50
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 */
// Get chat messages
router.get('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findById(req.params.chatId)
      .populate('participants', 'username profileImage')
      .populate('messages.senderId', 'username profileImage');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get paginated messages
    const totalMessages = chat.messages.length;
    const startIndex = Math.max(0, totalMessages - (page * limit));
    const endIndex = totalMessages - ((page - 1) * limit);

    const messages = chat.messages.slice(startIndex, endIndex).reverse();

    // Mark messages as seen
    await Chat.findByIdAndUpdate(req.params.chatId, {
      $set: {
        'unreadCount.$[elem].count': 0
      }
    }, {
      arrayFilters: [{ 'elem.userId': req.user._id }]
    });

    res.json({
      success: true,
      messages,
      hasMore: startIndex > 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/chat/{chatId}/message:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message in chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 1000
 *               messageType:
 *                 type: string
 *                 enum: [text, image, video, document]
 *                 default: text
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
// Send message
router.post('/:chatId/message', authenticate, upload.single('media'), [
  body('text').optional().isLength({ max: 1000 }).withMessage('Message text max 1000 characters')
], async (req, res) => {
  try {
    const { text, messageType = 'text' } = req.body;

    if (!text && !req.file) {
      return res.status(400).json({ message: 'Message text or media is required' });
    }

    const chat = await Chat.findById(req.params.chatId)
      .populate('participants', 'username profileImage');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = {
      senderId: req.user._id,
      text: text || '',
      messageType,
      status: 'sent'
    };

    if (req.file) {
      message.media = {
        url: `/uploads/chat/${req.file.filename}`,
        filename: req.file.originalname
      };
      message.messageType = req.file.mimetype.startsWith('image/') ? 'image' :
        req.file.mimetype.startsWith('video/') ? 'video' : 'document';
    }

    chat.messages.push(message);
    chat.lastMessage = {
      text: text || `Sent a ${messageType}`,
      senderId: req.user._id,
      timestamp: new Date()
    };

    // Update unread count for other participants
    chat.unreadCount.forEach(uc => {
      if (uc.userId.toString() !== req.user._id.toString()) {
        uc.count += 1;
      }
    });

    await chat.save();

    const newMessage = chat.messages[chat.messages.length - 1];
    await chat.populate('messages.senderId', 'username profileImage');

    // Emit message to other participants via Socket.io
    const otherParticipants = chat.participants.filter(p =>
      p._id.toString() !== req.user._id.toString()
    );

    otherParticipants.forEach(participant => {
      io.to(participant._id.toString()).emit('newMessage', {
        chatId: chat._id,
        message: newMessage,
        sender: req.user
      });
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/chat/{chatId}/message/{messageId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Delete a message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
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
 *               - deleteFor
 *             properties:
 *               deleteFor:
 *                 type: string
 *                 enum: [me, everyone]
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
// Delete message
router.delete('/:chatId/message/:messageId', authenticate, [
  body('deleteFor').isIn(['me', 'everyone']).withMessage('Delete for must be "me" or "everyone"')
], async (req, res) => {
  try {
    const { deleteFor } = req.body;

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is sender
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    if (deleteFor === 'everyone') {
      message.isDeleted = true;
      message.text = 'This message was deleted';
      message.deletedAt = new Date();
    } else {
      // Delete for me only
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
      }
    }

    await chat.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/chat/{chatId}/message/{messageId}/pin:
 *   post:
 *     tags: [Chat]
 *     summary: Pin or unpin a message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message pinned/unpinned successfully
 */
// Pin/Unpin message
router.post('/:chatId/message/:messageId/pin', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.isPinned = !message.isPinned;
    await chat.save();

    res.json({
      success: true,
      message: message.isPinned ? 'Message pinned' : 'Message unpinned',
      isPinned: message.isPinned
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/chat/{chatId}/message/{messageId}/forward:
 *   post:
 *     tags: [Chat]
 *     summary: Forward a message to other chats
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
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
 *               - targetChatIds
 *             properties:
 *               targetChatIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Message forwarded successfully
 */
// Forward message
router.post('/:chatId/message/:messageId/forward', authenticate, [
  body('targetChatIds').isArray().withMessage('Target chat IDs must be an array')
], async (req, res) => {
  try {
    const { targetChatIds } = req.body;

    const sourceChat = await Chat.findById(req.params.chatId);
    if (!sourceChat) {
      return res.status(404).json({ message: 'Source chat not found' });
    }

    const message = sourceChat.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Forward to target chats
    for (const targetChatId of targetChatIds) {
      const targetChat = await Chat.findById(targetChatId);
      if (targetChat && targetChat.participants.includes(req.user._id)) {
        const forwardedMessage = {
          senderId: req.user._id,
          text: message.text,
          messageType: message.messageType,
          media: message.media,
          forwardedFrom: sourceChat._id,
          status: 'sent'
        };

        targetChat.messages.push(forwardedMessage);
        targetChat.lastMessage = {
          text: `Forwarded: ${message.text}`,
          senderId: req.user._id,
          timestamp: new Date()
        };

        await targetChat.save();
      }
    }

    res.json({
      success: true,
      message: 'Message forwarded successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;