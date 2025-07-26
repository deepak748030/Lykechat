import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

// Cache configuration
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 300; // 5 minutes default

// Create cache instances for different data types
export const userCache = new NodeCache({ stdTTL: CACHE_TTL });
export const postCache = new NodeCache({ stdTTL: CACHE_TTL });
export const serviceCache = new NodeCache({ stdTTL: CACHE_TTL });
export const communityCache = new NodeCache({ stdTTL: CACHE_TTL });
export const storyCache = new NodeCache({ stdTTL: CACHE_TTL });
export const notificationCache = new NodeCache({ stdTTL: CACHE_TTL });

// Cache utility functions
export const getCacheKey = (prefix, id, suffix = '') => {
  return `${prefix}:${id}${suffix ? ':' + suffix : ''}`;
};

export const invalidateUserCache = (userId) => {
  const keys = userCache.keys();
  keys.forEach(key => {
    if (key.includes(userId)) {
      userCache.del(key);
    }
  });
};

export const invalidatePostCache = (postId) => {
  const keys = postCache.keys();
  keys.forEach(key => {
    if (key.includes(postId)) {
      postCache.del(key);
    }
  });
};

export const invalidateServiceCache = (serviceId) => {
  const keys = serviceCache.keys();
  keys.forEach(key => {
    if (key.includes(serviceId)) {
      serviceCache.del(key);
    }
  });
};

export const invalidateCommunityCache = (postId) => {
  const keys = communityCache.keys();
  keys.forEach(key => {
    if (key.includes(postId)) {
      communityCache.del(key);
    }
  });
};

export const clearAllCache = () => {
  userCache.flushAll();
  postCache.flushAll();
  serviceCache.flushAll();
  communityCache.flushAll();
  storyCache.flushAll();
  notificationCache.flushAll();
};

// Cache statistics
export const getCacheStats = () => {
  return {
    user: userCache.getStats(),
    post: postCache.getStats(),
    service: serviceCache.getStats(),
    community: communityCache.getStats(),
    story: storyCache.getStats(),
    notification: notificationCache.getStats()
  };
};