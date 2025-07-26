import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lukechat-secret-key-2024';

export const initializeSocket = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.user.username} connected: ${socket.id}`);

    // Join user to their own room for notifications
    socket.join(socket.userId);

    // Update user online status
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: new Date()
    });

    // Broadcast online status to relevant users
    socket.broadcast.emit('userOnline', {
      userId: socket.userId,
      username: socket.user.username
    });

    // Handle joining chat rooms
    socket.on('joinChat', (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`User ${socket.user.username} joined chat: ${chatId}`);
    });

    // Handle leaving chat rooms
    socket.on('leaveChat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`User ${socket.user.username} left chat: ${chatId}`);
    });

    // Handle typing indicators
    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(`chat_${chatId}`).emit('userTyping', {
        userId: socket.userId,
        username: socket.user.username,
        isTyping
      });
    });

    // Handle message status updates
    socket.on('messageDelivered', ({ messageId, chatId }) => {
      socket.to(`chat_${chatId}`).emit('messageStatusUpdate', {
        messageId,
        status: 'delivered'
      });
    });

    socket.on('messageSeen', ({ messageId, chatId }) => {
      socket.to(`chat_${chatId}`).emit('messageStatusUpdate', {
        messageId,
        status: 'seen'
      });
    });

    // Handle video/voice call signaling
    socket.on('callUser', ({ chatId, signalData, callType }) => {
      socket.to(`chat_${chatId}`).emit('incomingCall', {
        from: socket.userId,
        signalData,
        callType,
        callerName: socket.user.username,
        callerImage: socket.user.profileImage
      });
    });

    socket.on('answerCall', ({ chatId, signalData }) => {
      socket.to(`chat_${chatId}`).emit('callAccepted', {
        signalData
      });
    });

    socket.on('rejectCall', ({ chatId }) => {
      socket.to(`chat_${chatId}`).emit('callRejected');
    });

    socket.on('endCall', ({ chatId }) => {
      socket.to(`chat_${chatId}`).emit('callEnded');
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected: ${socket.id}`);

      // Update user offline status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Broadcast offline status
      socket.broadcast.emit('userOffline', {
        userId: socket.userId,
        username: socket.user.username,
        lastSeen: new Date()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Handle connection errors
  io.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });
};