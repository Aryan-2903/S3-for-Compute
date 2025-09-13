const mongoose = require('mongoose');

const functionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  config: {
    timeout: {
      type: Number,
      default: 30000 // 30 seconds
    },
    retryCount: {
      type: Number,
      default: 3
    }
  }
});

module.exports = mongoose.model('Function', functionSchema);
