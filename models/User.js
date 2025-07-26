import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  mobileNumber: {
    type: String,
    required: true,
    match: /^[6-9]\d{9}$/
  },
  email: {
    type: String,
    // sparse: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 150,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  profession: {
    type: String,
    default: ''
  },
  about: {
    type: String,
    maxlength: 500,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  instagramHandle: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  savedCommunityPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityPost'
  }],
  fcmToken: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      ret.createdAt = new Date(ret.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      ret.updatedAt = new Date(ret.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      return ret;
    }
  }
});

// Index for better query performance
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ mobileNumber: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);