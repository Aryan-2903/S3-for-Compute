const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
  functionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Function',
    required: true
  },
  input: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  output: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 0
  },
  error: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  },
  instanceId: {
    type: String,
    default: null
  },
  cost: {
    tier: {
      type: String,
      enum: ['basic', 'standard', 'premium', 'enterprise'],
      default: 'basic'
    },
    baseCost: {
      type: Number,
      default: 0
    },
    coldStartCost: {
      type: Number,
      default: 0
    },
    retryCost: {
      type: Number,
      default: 0
    },
    dataTransferCost: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    resourceUsage: {
      memoryMB: {
        type: Number,
        default: 128
      },
      cpuCores: {
        type: Number,
        default: 0.1
      }
    }
  }
});

// Calculate duration before saving
executionSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = this.endTime - this.startTime;
  }
  next();
});

module.exports = mongoose.model('Execution', executionSchema);
