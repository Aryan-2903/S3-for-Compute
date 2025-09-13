const mongoose = require('mongoose');

const scalingEventSchema = new mongoose.Schema({
  functionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Function',
    required: true
  },
  action: {
    type: String,
    enum: ['scale_up', 'scale_down'],
    required: true
  },
  instanceCount: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('ScalingEvent', scalingEventSchema);
