# 🚀 Lykechat - Complete Social Media Backend

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green.svg)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg)](https://socket.io/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-orange.svg)](https://jwt.io/)
[![Swagger](https://img.shields.io/badge/API-Swagger-green.svg)](https://swagger.io/)

A comprehensive Node.js backend for a social media application with Instagram-like features, WhatsApp-like messaging, services marketplace, community discussions, and admin dashboard.

## 🌟 Features Overview

### 🔐 Authentication System
- **OTP-based authentication** using mobile numbers (Indian format)
- **6-digit OTP** with 1-minute expiration
- **Secure JWT tokens** for session management
- **Admin authentication** with role-based permissions

### 👥 User Management
- **Complete user profiles** with customizable information
- **Follow/Unfollow system** similar to Instagram
- **User suggestions** and discovery algorithms
- **Block/Unblock functionality** for user safety
- **Profile customization** with image uploads
- **Online/Offline status** tracking

### 📱 Posts System
- **Create posts** with multiple media (images/videos)
- **Privacy controls** (public/private/followers only)
- **Like/Unlike functionality** with user tracking
- **Commenting system** with nested replies and likes
- **Share posts** with tracking metrics
- **Report inappropriate content** system

### 📖 Stories Feature
- **24-hour stories** similar to Instagram
- **Image and video support** with thumbnails
- **Viewer tracking** - see who viewed your stories
- **Followers-only visibility** for privacy
- **Auto-expiration** after 24 hours

### 🏘️ Community System
- **Category-based discussions** (tech, business, social, health, education, entertainment, sports, other)
- **Ask questions** and engage with community
- **Like and comment** on community posts with nested replies
- **Save community posts** for later reference
- **Sort by categories** and popularity
- **Real-time notifications** for interactions

### 🛍️ Services Marketplace
- **Create and manage services/businesses** with detailed information
- **Multiple images upload** for service showcase
- **Schedule management** with working hours and days
- **Service categories** and advanced search functionality
- **Rating and review system** with 5-star ratings
- **Location-based services** discovery
- **Price range filtering** (min/max amounts)
- **Home service availability** options

### 💬 Real-time Messaging
- **Real-time chat** using Socket.io
- **Message status** (sent/delivered/seen)
- **Online/Offline status** tracking
- **Media sharing** in chats (images, videos, documents)
- **Message management** (delete, pin, forward)
- **Typing indicators** for better UX
- **Video/Voice call signaling** support

### 🔔 Notifications System
- **Real-time notifications** for all activities
- **Follow notifications** when someone follows you
- **Post interaction notifications** (likes, comments, shares)
- **Community engagement notifications**
- **Service review notifications**
- **Mark as read/unread functionality**
- **Notification filtering** by type and status

### 🚨 Reporting & Moderation
- **Report users, posts, and services** with multiple categories
- **Report categories**: spam, harassment, inappropriate content, fake profile, copyright, other
- **Admin moderation system** with status tracking
- **Report status management** (pending, reviewed, resolved, dismissed)

### 🎛️ Admin Dashboard
- **Complete admin panel** with secure authentication
- **User management** (view, activate/deactivate users)
- **Content moderation** (posts, services management)
- **Report management** with comprehensive status updates
- **Analytics dashboard** with detailed statistics
- **Cache management** and system monitoring
- **Role-based permissions** (super_admin, admin, moderator)

### ⚡ Performance & Caching
- **NodeCache implementation** for improved performance
- **Cache invalidation** strategies for data consistency
- **Optimized database queries** with proper indexing
- **Memory usage monitoring** and optimization
- **Response time optimization** with caching layers

### 📚 API Documentation
- **Swagger/OpenAPI 3.0** comprehensive documentation
- **Interactive API explorer** for testing endpoints
- **Request/response examples** for all endpoints
- **Authentication examples** and error handling
- **Comprehensive schema definitions**

### 🧪 Testing
- **Jest testing framework** for reliability
- **Unit tests** for all major components
- **Integration tests** for API endpoints
- **Test coverage reporting** for quality assurance
- **Authentication and authorization testing**

## 🛠️ Technology Stack

### Backend Technologies
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **Socket.io** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing and security

### File Handling & Storage
- **Multer** - File upload middleware
- **File organization** - Structured upload directories
- **Image/Video support** - Multiple format handling
- **File size limits** - 50MB maximum per file

### Security & Validation
- **Helmet** - Security headers middleware
- **CORS** - Cross-origin resource sharing
- **express-validator** - Input validation and sanitization
- **Rate limiting** - API abuse prevention
- **Input sanitization** - XSS protection

### Performance & Monitoring
- **NodeCache** - In-memory caching solution
- **Compression** - Response compression middleware
- **Morgan** - HTTP request logger
- **Memory monitoring** - Performance tracking

### Development & Documentation
- **Swagger UI** - API documentation interface
- **Jest** - Testing framework
- **Nodemon** - Development auto-restart
- **ESM modules** - Modern JavaScript modules

## 📋 Complete API Endpoints

### 🔐 Authentication Routes
```http
POST   /api/auth/send-otp          # Send OTP to mobile number
POST   /api/auth/verify-otp        # Verify OTP and login/register
```

### 🎛️ Admin Routes
```http
POST   /api/admin/login                           # Admin login
GET    /api/admin/dashboard                       # Dashboard statistics
GET    /api/admin/users                           # Get all users with pagination
PATCH  /api/admin/users/:id/toggle-status         # Toggle user active status
GET    /api/admin/posts                           # Get all posts with pagination
PATCH  /api/admin/posts/:id/toggle-status         # Toggle post active status
GET    /api/admin/reports                         # Get all reports with filtering
PATCH  /api/admin/reports/:id/update-status       # Update report status
POST   /api/admin/cache/clear                     # Clear all cache
```

### 👥 User Management Routes
```http
GET    /api/users/profile                         # Get current user profile
GET    /api/users/:userId                         # Get user by ID
PUT    /api/users/profile                         # Update profile with image upload
POST   /api/users/:userId/follow                  # Follow/Unfollow user
GET    /api/users/:userId/posts                   # Get user's posts with pagination
GET    /api/users/:userId/followers               # Get user's followers list
GET    /api/users/:userId/following               # Get user's following list
GET    /api/users/suggestions/friends             # Get friend suggestions
POST   /api/users/:userId/block                   # Block/Unblock user
GET    /api/users/blocked/users                   # Get blocked users list
```

### 📱 Posts Routes
```http
POST   /api/posts                                 # Create post with media upload
GET    /api/posts/feed                            # Get home feed posts with pagination
GET    /api/posts/:postId                         # Get post by ID with details
POST   /api/posts/:postId/like                    # Like/Unlike post
POST   /api/posts/:postId/comment                 # Add comment to post
POST   /api/posts/:postId/comment/:commentId/like # Like/Unlike comment
POST   /api/posts/:postId/share                   # Share post
POST   /api/posts/:postId/report                  # Report post
```

### 📖 Stories Routes
```http
POST   /api/stories                               # Create story with media upload
GET    /api/stories/feed                          # Get stories from following users
GET    /api/stories/my-stories                    # Get current user's stories
POST   /api/stories/:storyId/view                 # View story (track viewer)
GET    /api/stories/:storyId/viewers              # Get story viewers (owner only)
```

### 🏘️ Community Routes
```http
POST   /api/community                             # Create community post
GET    /api/community                             # Get community posts with filtering
GET    /api/community/saved                       # Get user's saved community posts
GET    /api/community/saved/:userId               # Get saved posts by user ID
GET    /api/community/category/:category          # Get posts by category
GET    /api/community/user/:userId                # Get posts by user ID
GET    /api/community/:postId                     # Get community post by ID
GET    /api/community/:postId/comments            # Get all comments for a post
GET    /api/community/:postId/comment/:commentId/replies # Get replies for a comment
POST   /api/community/:postId/like                # Like/Unlike community post
POST   /api/community/:postId/comment             # Add comment to community post
POST   /api/community/:postId/comment/:commentId/reply # Reply to specific comment
POST   /api/community/:postId/save                # Save/Unsave community post
DELETE /api/community/:postId                     # Delete community post (owner only)
```

### 🛍️ Services Routes
```http
POST   /api/services                              # Create service with images
PUT    /api/services/:serviceId                   # Update service (owner only)
GET    /api/services                              # Get all services with filtering
GET    /api/services/:serviceId                   # Get service by ID with details
GET    /api/services/search/query                 # Advanced search services
GET    /api/services/trending/categories          # Get trending service categories
GET    /api/services/category/:category           # Get services by category
POST   /api/services/:serviceId/review            # Add review to service
```

### 💬 Chat & Messaging Routes
```http
POST   /api/chat/start                            # Start/Get chat with user
GET    /api/chat                                  # Get user's chats list
GET    /api/chat/:chatId/messages                 # Get chat messages with pagination
POST   /api/chat/:chatId/message                  # Send message with media support
DELETE /api/chat/:chatId/message/:messageId       # Delete message
POST   /api/chat/:chatId/message/:messageId/pin   # Pin/Unpin message
POST   /api/chat/:chatId/message/:messageId/forward # Forward message to other chats
```

### 🔔 Notifications Routes
```http
GET    /api/notifications                         # Get user's notifications with filtering
GET    /api/notifications/user/:userId            # Get notifications by user ID
GET    /api/notifications/unread                  # Get only unread notifications
GET    /api/notifications/:notificationId         # Get specific notification
PUT    /api/notifications/:notificationId/read    # Mark notification as read
PUT    /api/notifications/read/all                # Mark all notifications as read
DELETE /api/notifications/:notificationId         # Delete specific notification
DELETE /api/notifications/delete/all              # Delete all notifications
```

### 🚨 Reports Routes
```http
POST   /api/reports/user                          # Report user
POST   /api/reports/post                          # Report post
POST   /api/reports/service                       # Report service
GET    /api/reports/my-reports                    # Get user's submitted reports
```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v18.x or higher)
- **MongoDB** (v6.x or higher)
- **npm** or **yarn** package manager

### 1. Clone the Repository
```bash
git clone https://github.com/deepak748030/Lykechat.git
cd Lykechat
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=lykechat-secret-key-2024-change-in-production

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lykechat

# OTP Service Configuration (for SMS)
OTP_API_KEY=your-otp-api-key
OTP_API_SALT=your-otp-api-salt

# Email Configuration (Optional)
EMAIL_FROM=noreply@lykechat.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=50
UPLOAD_DIR=uploads

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session Configuration
SESSION_SECRET=lykechat-session-secret-2024

# Admin Configuration
ADMIN_SECRET_KEY=lykechat-admin-super-secret-2024
ADMIN_EMAIL=admin@lykechat.app
ADMIN_PASSWORD=Admin@123456

# Cache Configuration
CACHE_TTL=300
```

### 4. Create Super Admin
```bash
node scripts/createAdmin.js
```

### 5. Start the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

### 6. Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## 📚 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/api/health`
- **API Base URL**: `http://localhost:3000/api`

## 🔌 Socket.io Real-time Events

### Client to Server Events
```javascript
// Authentication
socket.emit('authenticate', { token })

// Chat Management
socket.emit('joinChat', chatId)
socket.emit('leaveChat', chatId)
socket.emit('typing', { chatId, isTyping })

// Message Status
socket.emit('messageDelivered', { messageId, chatId })
socket.emit('messageSeen', { messageId, chatId })

// Video/Voice Calls
socket.emit('callUser', { chatId, signalData, callType })
socket.emit('answerCall', { chatId, signalData })
socket.emit('rejectCall', { chatId })
socket.emit('endCall', { chatId })
```

### Server to Client Events
```javascript
// User Status Updates
socket.on('userOnline', { userId, username })
socket.on('userOffline', { userId, username, lastSeen })

// Chat Events
socket.on('newMessage', { chatId, message, sender })
socket.on('userTyping', { userId, username, isTyping })
socket.on('messageStatusUpdate', { messageId, status })

// Call Events
socket.on('incomingCall', { from, signalData, callType, callerName, callerImage })
socket.on('callAccepted', { signalData })
socket.on('callRejected')
socket.on('callEnded')
```

## 🗂️ Project Structure

```
lykechat-backend/
├── 📁 config/                    # Configuration files
│   └── swagger.js                # Swagger/OpenAPI configuration
├── 📁 models/                    # MongoDB models with Mongoose
│   ├── User.js                   # User model with authentication
│   ├── Admin.js                  # Admin model with roles
│   ├── Post.js                   # Posts model with media support
│   ├── Story.js                  # Stories model with expiration
│   ├── CommunityPost.js          # Community discussions model
│   ├── Service.js                # Services marketplace model
│   ├── Chat.js                   # Chat and messaging model
│   ├── Notification.js           # Notifications system model
│   └── Report.js                 # Reporting system model
├── 📁 routes/                    # API route handlers
│   ├── auth.js                   # Authentication routes
│   ├── admin.js                  # Admin panel routes
│   ├── user.js                   # User management routes
│   ├── post.js                   # Posts CRUD routes
│   ├── story.js                  # Stories management routes
│   ├── community.js              # Community discussions routes
│   ├── service.js                # Services marketplace routes
│   ├── chat.js                   # Real-time messaging routes
│   ├── notification.js           # Notifications management routes
│   └── report.js                 # Reporting system routes
├── 📁 middleware/                # Custom middleware functions
│   ├── auth.js                   # JWT authentication middleware
│   ├── adminAuth.js              # Admin authentication middleware
│   ├── upload.js                 # File upload handling middleware
│   ├── errorHandler.js           # Global error handling middleware
│   └── notFound.js               # 404 error handling middleware
├── 📁 socket/                    # Socket.io event handlers
│   └── socketHandler.js          # Real-time communication logic
├── 📁 utils/                     # Utility functions and helpers
│   ├── otpService.js             # OTP generation and verification
│   └── cache.js                  # Caching utilities and management
├── 📁 tests/                     # Test files and test suites
│   ├── auth.test.js              # Authentication tests
│   ├── user.test.js              # User management tests
│   └── admin.test.js             # Admin functionality tests
├── 📁 scripts/                   # Utility scripts
│   └── createAdmin.js            # Super admin creation script
├── 📁 uploads/                   # File uploads directory
│   ├── posts/                    # Post media files
│   ├── stories/                  # Story media files
│   ├── profiles/                 # Profile images
│   ├── services/                 # Service images
│   └── chat/                     # Chat media files
├── server.js                     # Main application entry point
├── package.json                  # Dependencies and scripts
├── .env.example                  # Environment variables template
└── README.md                     # Project documentation
```

## ⚡ Performance Optimizations

### Caching Strategy
- **User Cache**: Profile data, followers/following lists, user suggestions
- **Post Cache**: Feed data, popular posts, post interactions
- **Service Cache**: Service listings, categories, search results
- **Community Cache**: Popular discussions, category-wise posts
- **Notification Cache**: Recent notifications, unread counts

### Cache Invalidation
- **Automatic invalidation** on data updates and modifications
- **Manual cache clearing** via admin panel for system maintenance
- **TTL-based expiration** (5 minutes default) for data freshness
- **Selective invalidation** for specific data types and users

### Database Optimization
- **Proper indexing** on frequently queried fields
- **Compound indexes** for complex queries
- **Text indexes** for search functionality
- **Sparse indexes** for optional fields
- **Query optimization** with aggregation pipelines

## 🔐 Security Features

### Authentication & Authorization
- **JWT tokens** with secure secret keys
- **Role-based access control** for admin functions
- **Token expiration** and refresh mechanisms
- **Password hashing** with bcryptjs and salt rounds

### Input Validation & Sanitization
- **express-validator** for comprehensive input validation
- **XSS protection** through input sanitization
- **SQL injection prevention** with parameterized queries
- **File upload restrictions** with type and size limits

### Security Headers & Middleware
- **Helmet** for security headers configuration
- **CORS** configuration for cross-origin requests
- **Rate limiting** to prevent API abuse and DDoS attacks
- **Request size limits** to prevent payload attacks

### Data Protection
- **Sensitive data exclusion** from API responses
- **User privacy controls** for posts and profiles
- **Block/unblock functionality** for user safety
- **Content reporting system** for community moderation

## 📊 Response Format Standards

### Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data object
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors array (if applicable)
  ]
}
```

### Pagination Response Format
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "current": 1,
      "pages": 10,
      "total": 100
    }
  }
}
```

## 🧪 Testing Strategy

### Test Coverage Areas
- **Authentication flows** - OTP generation, verification, JWT handling
- **User management** - Profile operations, follow/unfollow, blocking
- **Content operations** - Posts, stories, community interactions
- **Admin functionality** - User management, content moderation
- **API validation** - Input validation, error handling
- **Security testing** - Authentication, authorization, input sanitization

### Running Tests
```bash
# Run all test suites
npm test

# Run specific test file
npm test auth.test.js

# Run tests with detailed coverage report
npm run test:coverage

# Run tests in watch mode for development
npm run test:watch
```

## 🌍 Timezone Configuration

All timestamps in the application use **Indian Standard Time (IST)** as specified:
- **Timezone**: `Asia/Kolkata`
- **Format**: Localized date/time strings
- **Consistency**: All date operations use IST for uniformity

## 🚀 Deployment Guide

### Supported Platforms
- **Railway** - Recommended for easy deployment
- **Render** - Free tier available with limitations
- **Heroku** - Classic platform with add-ons support
- **DigitalOcean** - VPS deployment with full control
- **AWS EC2** - Scalable cloud deployment

### Pre-deployment Checklist
1. ✅ Set environment variables on hosting platform
2. ✅ Configure MongoDB connection string for production
3. ✅ Set up file storage solution (consider cloud storage)
4. ✅ Configure CORS for frontend domain
5. ✅ Create super admin account using the script
6. ✅ Set up proper caching strategy for production
7. ✅ Configure SSL/TLS certificates for HTTPS
8. ✅ Set up monitoring and logging solutions

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-super-secure-jwt-secret
ADMIN_SECRET_KEY=your-admin-secret-key
# ... other production configurations
```

## 📈 Monitoring & Analytics

### Health Monitoring Endpoints
- **Health Check**: `/api/health` - Server status and uptime
- **Memory Usage**: Included in health check response
- **Cache Statistics**: Available through admin panel
- **Database Connection**: Monitored and logged

### Admin Analytics Dashboard
- **User Growth**: Registration trends and active users
- **Content Engagement**: Posts, stories, community interactions
- **Service Marketplace**: Service listings and reviews analytics
- **Report Management**: Content moderation statistics
- **System Performance**: Cache hit rates and response times

## 🤝 Contributing Guidelines

### How to Contribute
1. **Fork the repository** to your GitHub account
2. **Create a feature branch** from the main branch
3. **Make your changes** with proper code formatting
4. **Write tests** for new features and bug fixes
5. **Run existing tests** to ensure no regressions
6. **Update documentation** if needed
7. **Submit a pull request** with detailed description

### Code Standards
- **ESLint configuration** for consistent code style
- **Proper error handling** with try-catch blocks
- **Input validation** for all API endpoints
- **Security best practices** implementation
- **Performance optimization** considerations
- **Comprehensive commenting** for complex logic

### Pull Request Process
1. Ensure all tests pass successfully
2. Update README.md if adding new features
3. Add proper commit messages following conventional commits
4. Request review from maintainers
5. Address feedback and make necessary changes

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for complete details.

## 👨‍💻 Developer Information

**Deepak Kushwah** - Full Stack Developer
- 🎓 B.Tech in Computer Science & Engineering
- 💻 MERN Stack & React Native Specialist
- 🏗️ Microservices & Real-time Systems Expert
- 🔐 Payment Integration & Security Specialist

### Connect with Developer
- 📧 **Email**: [deepak748930@gmail.com](mailto:deepak748930@gmail.com)
- 🔗 **LinkedIn**: [Deepak Kushwah](https://linkedin.com/in/deepak-kushwah)
- 💻 **GitHub**: [deepak748030](https://github.com/deepak748030)
- 🌐 **Portfolio**: [DeepakDevPortfolio](https://deepakdevportfolio.netlify.app)

### Technical Expertise
- **Frontend**: React.js, TypeScript, React Native, Next.js
- **Backend**: Node.js, Express.js, MongoDB, PostgreSQL
- **Real-time**: Socket.io, WebSockets, Kafka, Redis
- **Cloud & DevOps**: Docker, Kubernetes, AWS, NGINX
- **Payment Systems**: Razorpay, UPI, Wallet Integration

---

## 🎉 Acknowledgments

Special thanks to all contributors and the open-source community for making this project possible. Your feedback and contributions help make Lykechat better for everyone!

**Lykechat Backend** - A complete, production-ready social media solution with modern features, real-time capabilities, and comprehensive admin dashboard! 🚀

---

*Built with ❤️ by [Deepak Kushwah](https://github.com/deepak748030)*