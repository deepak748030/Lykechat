# Lykechat - Complete Social Media Backend

A comprehensive Node.js backend for a social media application with Instagram-like features, WhatsApp-like messaging, services marketplace, and admin dashboard.

## 🚀 Features

### Authentication System
- **OTP-based authentication** using mobile numbers
- **6-digit OTP** with 1-minute expiration
- **Secure JWT tokens** for session management

### User Management
- **Complete user profiles** with customizable information
- **Follow/Unfollow system** similar to Instagram
- **User suggestions** and discovery
- **Block/Unblock functionality**
- **Profile customization** with image uploads

### Posts System
- **Create posts** with multiple media (images/videos)
- **Privacy controls** (public/private/followers only)
- **Like/Unlike functionality** with user tracking
- **Commenting system** with nested replies and likes
- **Share posts** with tracking
- **Report inappropriate content**

### Stories Feature
- **24-hour stories** similar to Instagram
- **Image and video support**
- **Viewer tracking** - see who viewed your stories
- **Followers-only visibility**

### Community System
- **Category-based discussions** (tech, business, social, etc.)
- **Ask questions** and engage with community
- **Like and comment** on community posts
- **Save community posts** for later
- **Sort by categories** and popularity

### Services Marketplace
- **Create and manage services/businesses**
- **Detailed service information** with images
- **Schedule management** with working hours
- **Service categories** and search functionality
- **Rating and review system**
- **Location-based services**

### Real-time Messaging
- **Real-time chat** using Socket.io
- **Message status** (sent/delivered/seen)
- **Online/Offline status** tracking
- **Media sharing** in chats
- **Message management** (delete, pin, forward)
- **Typing indicators**

### Notifications System
- **Real-time notifications** for all activities
- **Follow notifications**
- **Post interaction notifications**
- **Mark as read/unread functionality**

### Reporting & Moderation
- **Report users, posts, and services**
- **Multiple report categories**
- **Admin moderation system**

### Admin Dashboard
- **Complete admin panel** with authentication
- **User management** (view, activate/deactivate)
- **Content moderation** (posts, services)
- **Report management** with status updates
- **Analytics dashboard** with statistics
- **Cache management** and system monitoring

### Performance & Caching
- **NodeCache implementation** for improved performance
- **Cache invalidation** strategies
- **Optimized database queries**
- **Memory usage monitoring**

### API Documentation
- **Swagger/OpenAPI 3.0** documentation
- **Interactive API explorer**
- **Comprehensive endpoint documentation**
- **Request/response examples**

### Testing
- **Jest testing framework**
- **Unit tests** for all major components
- **Integration tests** for API endpoints
- **Test coverage reporting**
## 📋 API Endpoints

### Authentication
```http
POST /api/auth/send-otp          # Send OTP to mobile number
POST /api/auth/verify-otp        # Verify OTP and login/register
```

### Admin Routes
```http
POST /api/admin/login            # Admin login
GET  /api/admin/dashboard        # Dashboard statistics
GET  /api/admin/users            # Get all users
PATCH /api/admin/users/:id/toggle-status # Toggle user status
GET  /api/admin/posts            # Get all posts
PATCH /api/admin/posts/:id/toggle-status # Toggle post status
GET  /api/admin/reports          # Get all reports
PATCH /api/admin/reports/:id/update-status # Update report status
POST /api/admin/cache/clear      # Clear all cache
```

### User Management
```http
GET  /api/users/profile          # Get current user profile
GET  /api/users/:userId          # Get user by ID
PUT  /api/users/profile          # Update profile (with image upload)
POST /api/users/:userId/follow   # Follow/Unfollow user
GET  /api/users/:userId/posts    # Get user's posts
GET  /api/users/:userId/followers # Get user's followers
GET  /api/users/:userId/following # Get user's following
GET  /api/users/suggestions/friends # Get friend suggestions
POST /api/users/:userId/block    # Block/Unblock user
GET  /api/users/blocked/users    # Get blocked users
```

### Posts
```http
POST /api/posts                  # Create post (with media upload)
GET  /api/posts/feed            # Get home feed posts
GET  /api/posts/:postId         # Get post by ID
POST /api/posts/:postId/like    # Like/Unlike post
POST /api/posts/:postId/comment # Add comment to post
POST /api/posts/:postId/comment/:commentId/like # Like comment
POST /api/posts/:postId/share   # Share post
POST /api/posts/:postId/report  # Report post
```

### Stories
```http
POST /api/stories               # Create story (with media upload)
GET  /api/stories/feed         # Get stories from following users
GET  /api/stories/my-stories   # Get current user's stories
POST /api/stories/:storyId/view # View story
GET  /api/stories/:storyId/viewers # Get story viewers
```

### Community
```http
POST /api/community             # Create community post
GET  /api/community             # Get community posts (with filtering)
POST /api/community/:postId/like # Like community post
POST /api/community/:postId/comment # Comment on community post
POST /api/community/:postId/comment/:commentId/reply # Reply to comment
POST /api/community/:postId/save # Save/Unsave community post
DELETE /api/community/:postId   # Delete community post
```

### Services
```http
POST /api/services              # Create service (with images)
PUT  /api/services/:serviceId   # Update service
GET  /api/services              # Get all services
GET  /api/services/:serviceId   # Get service by ID
GET  /api/services/search/query # Search services
GET  /api/services/trending/categories # Get trending categories
GET  /api/services/category/:category # Get services by category
POST /api/services/:serviceId/review # Add review to service
```

### Chat & Messaging
```http
POST /api/chat/start            # Start/Get chat with user
GET  /api/chat                  # Get user's chats
GET  /api/chat/:chatId/messages # Get chat messages
POST /api/chat/:chatId/message  # Send message (with media)
DELETE /api/chat/:chatId/message/:messageId # Delete message
POST /api/chat/:chatId/message/:messageId/pin # Pin/Unpin message
POST /api/chat/:chatId/message/:messageId/forward # Forward message
```

### Notifications
```http
GET  /api/notifications         # Get user's notifications
PUT  /api/notifications/:notificationId/read # Mark notification as read
PUT  /api/notifications/read/all # Mark all notifications as read
DELETE /api/notifications/:notificationId # Delete notification
```

### Reports
```http
POST /api/reports/user          # Report user
POST /api/reports/post          # Report post
POST /api/reports/service       # Report service
GET  /api/reports/my-reports    # Get user's reports
```

## 🛠️ Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd lykechat-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory:
```env
PORT=3000
JWT_SECRET=lykechat-secret-key-2024-change-in-production
MONGODB_URI=your-mongodb-connection-string
OTP_API_KEY=your-otp-api-key
OTP_API_SALT=your-otp-api-salt
ADMIN_EMAIL=admin@lykechat.app
ADMIN_PASSWORD=Admin@123456
ADMIN_SECRET_KEY=lykechat-admin-super-secret-2024
CACHE_TTL=300
NODE_ENV=development
```

4. **Create Super Admin**
```bash
node scripts/createAdmin.js
```

5. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

6. **Run tests**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/api/health`

## 📱 Socket.io Events

### Client to Server Events
```javascript
// Authentication
socket.emit('authenticate', { token })

// Chat events
socket.emit('joinChat', chatId)
socket.emit('leaveChat', chatId)
socket.emit('typing', { chatId, isTyping })
socket.emit('messageDelivered', { messageId, chatId })
socket.emit('messageSeen', { messageId, chatId })

// Call events
socket.emit('callUser', { chatId, signalData, callType })
socket.emit('answerCall', { chatId, signalData })
socket.emit('rejectCall', { chatId })
socket.emit('endCall', { chatId })
```

### Server to Client Events
```javascript
// User status
socket.on('userOnline', { userId, username })
socket.on('userOffline', { userId, username, lastSeen })

// Chat events
socket.on('newMessage', { chatId, message, sender })
socket.on('userTyping', { userId, username, isTyping })
socket.on('messageStatusUpdate', { messageId, status })

// Call events
socket.on('incomingCall', { from, signalData, callType, callerName, callerImage })
socket.on('callAccepted', { signalData })
socket.on('callRejected')
socket.on('callEnded')
```

## 🗂️ File Structure

```
lykechat-backend/
├── config/                # Configuration files
│   └── swagger.js
├── models/                 # MongoDB models
│   ├── User.js
│   ├── Admin.js
│   ├── Post.js
│   ├── Story.js
│   ├── CommunityPost.js
│   ├── Service.js
│   ├── Chat.js
│   ├── Notification.js
│   └── Report.js
├── routes/                 # API routes
│   ├── auth.js
│   ├── admin.js
│   ├── user.js
│   ├── post.js
│   ├── story.js
│   ├── community.js
│   ├── service.js
│   ├── chat.js
│   ├── notification.js
│   └── report.js
├── middleware/            # Custom middleware
│   ├── auth.js
│   ├── adminAuth.js
│   ├── upload.js
│   ├── errorHandler.js
│   └── notFound.js
├── socket/               # Socket.io handlers
│   └── socketHandler.js
├── utils/               # Utility functions
│   ├── otpService.js
│   └── cache.js
├── tests/               # Test files
│   ├── auth.test.js
│   ├── user.test.js
│   └── admin.test.js
├── scripts/             # Utility scripts
│   └── createAdmin.js
├── uploads/            # File uploads directory
│   ├── posts/
│   ├── stories/
│   ├── profiles/
│   ├── services/
│   └── chat/
├── server.js           # Main server file
├── .env                # Environment variables
├── package.json
└── README.md
```

## 🔧 Performance Optimizations

### Caching Strategy
- **User Cache**: Profile data, followers/following lists
- **Post Cache**: Feed data, popular posts
- **Service Cache**: Service listings, categories
- **Community Cache**: Popular discussions, categories
- **Notification Cache**: Recent notifications

### Cache Invalidation
- Automatic cache invalidation on data updates
- Manual cache clearing via admin panel
- TTL-based expiration (5 minutes default)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Admin Authentication

Admin routes require admin JWT tokens:

```http
Authorization: Bearer <your-admin-jwt-token>
```
## 📊 Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## 🧪 Testing

The project includes comprehensive tests using Jest:

```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### Test Coverage
- Authentication routes
- User management
- Admin functionality
- API validation
- Error handling

## 🌍 Timezone

All timestamps are in **Indian Standard Time (IST)** as specified. The application uses `Asia/Kolkata` timezone for all date/time operations.

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Express-validator
- **Password Hashing**: bcryptjs
- **JWT Tokens**: Secure authentication
- **File Upload Security**: Multer with restrictions

## 📝 Features Overview

### Core Functionality
- ✅ **OTP Authentication** with mobile number verification
- ✅ **User Profiles** with complete customization
- ✅ **Social Features** (follow, like, comment, share)
- ✅ **Stories** with 24-hour expiration
- ✅ **Real-time Chat** with media support
- ✅ **Service Marketplace** with reviews and ratings
- ✅ **Community Discussions** with categories
- ✅ **Notifications System** for all activities
- ✅ **Reporting & Moderation** tools
- ✅ **Admin Dashboard** with full management capabilities
- ✅ **Caching System** for improved performance
- ✅ **API Documentation** with Swagger
- ✅ **Comprehensive Testing** with Jest

### Technical Features
- ✅ **Scalable Architecture** with proper separation of concerns
- ✅ **File Upload Handling** with Multer
- ✅ **Real-time Communication** with Socket.io
- ✅ **Input Validation** with express-validator
- ✅ **Error Handling** with custom middleware
- ✅ **Security** with Helmet, CORS, and rate limiting
- ✅ **Database Optimization** with proper indexing
- ✅ **Caching** with NodeCache for performance
- ✅ **Environment Variables** for configuration
- ✅ **Swagger Documentation** for API reference
- ✅ **Unit & Integration Tests** for reliability

## 🚀 Deployment

The application is ready for deployment on platforms like:
- **Railway**
- **Render**
- **Heroku**
- **DigitalOcean**
- **AWS EC2**

Make sure to:
1. Set environment variables on your hosting platform
2. Configure MongoDB connection string
3. Set up file storage (consider using cloud storage for production)
4. Configure CORS for your frontend domain
5. Create super admin account
6. Set up proper caching strategy for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new features
5. Run tests and ensure they pass
6. Update documentation if needed
7. Submit a pull request

## 📈 Monitoring & Analytics

### Health Monitoring
- Health check endpoint: `/api/health`
- Memory usage tracking
- Uptime monitoring
- Cache statistics

### Admin Analytics
- User growth statistics
- Content engagement metrics
- Service marketplace analytics
- Report management dashboard
## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Lykechat Backend** - A complete social media solution with modern features, real-time capabilities, and comprehensive admin dashboard! 🚀