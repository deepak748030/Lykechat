import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
});

const serviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceName: {
    type: String,
    required: true,
    maxlength: 100
  },
  about: {
    type: String,
    required: true,
    maxlength: 1000
  },
  images: [{
    type: String
  }],
  address: {
    type: String,
    required: true,
    maxlength: 200
  },
  mobileNumbers: [{
    type: String,
    match: /^[6-9]\d{9}$/
  }],
  minAmount: {
    type: Number,
    required: true,
    min: 0
  },
  maxAmount: {
    type: Number,
    required: true,
    min: 0
  },
  homeServiceAvailable: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    required: true,
    enum: ['tech', 'business', 'health', 'education', 'food', 'beauty', 'fitness', 'repair', 'cleaning', 'other']
  },
  schedule: [scheduleSchema],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    text: {
      type: String,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.createdAt = new Date(ret.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      ret.updatedAt = new Date(ret.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      return ret;
    }
  }
});

serviceSchema.index({ category: 1 });
serviceSchema.index({ serviceName: 'text', about: 'text' });
serviceSchema.index({ 'rating.average': -1 });
serviceSchema.index({ userId: 1 });

export default mongoose.model('Service', serviceSchema);