import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lykechat API',
      version: '1.0.0',
      description: 'Complete social media backend with messaging, services and admin dashboard',
      contact: {
        name: 'Lykechat Team',
        email: 'support@lykechat.app'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.lykechat.app' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        adminAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Admin JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            mobileNumber: { type: 'string' },
            email: { type: 'string' },
            profileImage: { type: 'string' },
            bio: { type: 'string' },
            location: { type: 'string' },
            profession: { type: 'string' },
            isVerified: { type: 'boolean' },
            isOnline: { type: 'boolean' },
            followers: { type: 'array', items: { type: 'string' } },
            following: { type: 'array', items: { type: 'string' } }
          }
        },
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            description: { type: 'string' },
            media: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['image', 'video'] },
                  url: { type: 'string' }
                }
              }
            },
            type: { type: 'string', enum: ['public', 'private', 'followers'] },
            likes: { type: 'array' },
            comments: { type: 'array' },
            createdAt: { type: 'string' }
          }
        },
        Service: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            serviceName: { type: 'string' },
            about: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            address: { type: 'string' },
            category: { type: 'string' },
            rating: {
              type: 'object',
              properties: {
                average: { type: 'number' },
                count: { type: 'number' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './models/*.js']
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };