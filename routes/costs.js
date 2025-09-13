const express = require('express');
const router = express.Router();
const CostService = require('../services/costService');
const Function = require('../models/Function');
const Execution = require('../models/Execution');

const costService = new CostService();

// Get pricing information
router.get('/pricing', (req, res) => {
  try {
    const pricingInfo = costService.getPricingInfo();
    res.json({
      success: true,
      data: pricingInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cost estimation for a function before execution
router.post('/estimate', async (req, res) => {
  try {
    const { functionId, input, estimatedDuration } = req.body;
    
    if (!functionId) {
      return res.status(400).json({
        success: false,
        error: 'Function ID is required'
      });
    }

    const func = await Function.findById(functionId);
    if (!func) {
      return res.status(404).json({
        success: false,
        error: 'Function not found'
      });
    }

    const estimation = costService.estimateExecutionCost(
      func, 
      input || {}, 
      estimatedDuration || 1000
    );

    res.json({
      success: true,
      data: estimation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cost summary for a specific function
router.get('/function/:functionId', async (req, res) => {
  try {
    const { functionId } = req.params;
    const { startDate, endDate } = req.query;

    if (!functionId) {
      return res.status(400).json({
        success: false,
        error: 'Function ID is required'
      });
    }

    // Default to last 24 hours if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const costSummary = await costService.calculateFunctionCosts(functionId, start, end);

    res.json({
      success: true,
      data: costSummary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system-wide cost summary
router.get('/system', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 24 hours if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const systemCosts = await costService.calculateSystemCosts(start, end);

    res.json({
      success: true,
      data: systemCosts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent executions with cost information
router.get('/executions', async (req, res) => {
  try {
    const { limit = 50, functionId } = req.query;
    
    let query = {};
    if (functionId) {
      query.functionId = functionId;
    }

    const executions = await Execution.find(query)
      .populate('functionId', 'name description')
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .select('functionId input output status startTime endTime duration retryCount cost');

    res.json({
      success: true,
      data: executions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cost trends over time
router.get('/trends', async (req, res) => {
  try {
    const { startDate, endDate, granularity = 'hour' } = req.query;

    // Default to last 7 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Group executions by time period
    let groupFormat;
    switch (granularity) {
      case 'minute':
        groupFormat = { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$startTime" } };
        break;
      case 'hour':
        groupFormat = { $dateToString: { format: "%Y-%m-%d %H:00", date: "$startTime" } };
        break;
      case 'day':
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } };
        break;
      default:
        groupFormat = { $dateToString: { format: "%Y-%m-%d %H:00", date: "$startTime" } };
    }

    const trends = await Execution.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: groupFormat,
          totalCost: { $sum: '$cost.totalCost' },
          executionCount: { $sum: 1 },
          averageDuration: { $avg: '$duration' },
          totalDuration: { $sum: '$duration' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: { start, end },
        granularity,
        trends
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cost breakdown by function
router.get('/breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 24 hours if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const breakdown = await Execution.aggregate([
      {
        $match: {
          startTime: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      {
        $lookup: {
          from: 'functions',
          localField: 'functionId',
          foreignField: '_id',
          as: 'function'
        }
      },
      {
        $unwind: '$function'
      },
      {
        $group: {
          _id: '$functionId',
          functionName: { $first: '$function.name' },
          totalCost: { $sum: '$cost.totalCost' },
          executionCount: { $sum: 1 },
          averageCost: { $avg: '$cost.totalCost' },
          totalDuration: { $sum: '$duration' },
          averageDuration: { $avg: '$duration' },
          tier: { $first: '$cost.tier' },
          costBreakdown: {
            $push: {
              baseCost: '$cost.baseCost',
              coldStartCost: '$cost.coldStartCost',
              retryCost: '$cost.retryCost',
              dataTransferCost: '$cost.dataTransferCost'
            }
          }
        }
      },
      {
        $addFields: {
          totalBaseCost: { $sum: '$costBreakdown.baseCost' },
          totalColdStartCost: { $sum: '$costBreakdown.coldStartCost' },
          totalRetryCost: { $sum: '$costBreakdown.retryCost' },
          totalDataTransferCost: { $sum: '$costBreakdown.dataTransferCost' }
        }
      },
      {
        $project: {
          _id: 1,
          functionName: 1,
          totalCost: 1,
          executionCount: 1,
          averageCost: 1,
          totalDuration: 1,
          averageDuration: 1,
          tier: 1,
          costBreakdown: {
            baseCost: '$totalBaseCost',
            coldStartCost: '$totalColdStartCost',
            retryCost: '$totalRetryCost',
            dataTransferCost: '$totalDataTransferCost'
          }
        }
      },
      {
        $sort: { totalCost: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: { start, end },
        breakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
