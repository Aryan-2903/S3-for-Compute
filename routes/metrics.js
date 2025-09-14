const express = require('express');
const router = express.Router();
const Execution = require('../models/Execution');
const ScalingEvent = require('../models/ScalingEvent');
const Function = require('../models/Function');

// Get system-wide metrics
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get execution metrics
    const totalExecutions = await Execution.countDocuments();
    const recentExecutions = await Execution.countDocuments({
      startTime: { $gte: oneHourAgo }
    });
    
    const completedExecutions = await Execution.countDocuments({
      status: 'completed',
      startTime: { $gte: oneHourAgo }
    });
    
    const failedExecutions = await Execution.countDocuments({
      status: 'failed',
      startTime: { $gte: oneHourAgo }
    });

    const pendingExecutions = await Execution.countDocuments({
      status: { $in: ['pending', 'running'] }
    });

    // Calculate success rate
    const totalRecent = completedExecutions + failedExecutions;
    const successRate = totalRecent > 0 ? (completedExecutions / totalRecent) * 100 : 0;

    // Get active functions
    const activeFunctions = await Function.countDocuments({ status: 'active' });

    // Get scaling events from last hour
    const recentScalingEvents = await ScalingEvent.find({
      timestamp: { $gte: oneHourAgo }
    }).sort({ timestamp: -1 });

    // Calculate current instance count from latest scaling event
    let currentInstances = 1; // Base instance
    if (recentScalingEvents.length > 0) {
      // Get the latest scaling event to determine current instance count
      const latestEvent = recentScalingEvents[0]; // Already sorted by timestamp desc
      currentInstances = latestEvent.instanceCount;
    }

    // Get average execution time
    const avgExecutionTime = await Execution.aggregate([
      { $match: { status: 'completed', startTime: { $gte: oneHourAgo } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    const metrics = {
      overview: {
        totalExecutions,
        recentExecutions,
        completedExecutions,
        failedExecutions,
        pendingExecutions,
        successRate: Math.round(successRate * 100) / 100,
        activeFunctions,
        currentInstances
      },
      performance: {
        averageExecutionTime: avgExecutionTime[0]?.avgDuration || 0,
        totalExecutionsToday: await Execution.countDocuments({
          startTime: { $gte: oneDayAgo }
        })
      },
      scaling: {
        recentEvents: recentScalingEvents,
        currentInstances
      }
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get execution history for charts
router.get('/executions/history', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const executions = await Execution.aggregate([
      {
        $match: {
          startTime: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$startTime' },
            day: { $dayOfMonth: '$startTime' },
            month: { $month: '$startTime' }
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.day': 1, '_id.hour': 1 }
      }
    ]);

    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get scaling events history
router.get('/scaling/history', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const scalingEvents = await ScalingEvent.find({
      timestamp: { $gte: startTime }
    }).sort({ timestamp: -1 }); // Sort by newest first for timeline

    res.json(scalingEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
