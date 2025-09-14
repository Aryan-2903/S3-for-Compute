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
    const end = endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1) : new Date(); // Include entire end date

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
    const end = endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1) : new Date(); // Include entire end date

    // Get executions and ensure they have cost data
    const executions = await Execution.find({
      startTime: { $gte: start, $lte: end },
      status: 'completed'
    }).populate('functionId');

    // Calculate costs for executions that don't have them
    for (const execution of executions) {
      if (!execution.cost || execution.cost.totalCost === 0) {
        const costInfo = costService.calculateExecutionCost(execution, execution.functionId);
        execution.cost = costInfo;
        await execution.save();
      }
    }

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

    // Get executions and calculate costs if needed
    const executions = await Execution.find({
      startTime: { $gte: start, $lte: end },
      status: 'completed'
    }).populate('functionId');

    // Calculate costs for executions that don't have them
    for (const execution of executions) {
      if (!execution.cost || execution.cost.totalCost === 0) {
        const costInfo = costService.calculateExecutionCost(execution, execution.functionId);
        execution.cost = costInfo;
        await execution.save();
      }
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
    const end = endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1) : new Date(); // Include entire end date

    // Get all completed executions with their functions
    const executions = await Execution.find({
      startTime: { $gte: start, $lte: end },
      status: 'completed'
    }).populate('functionId');

    // Group by function and calculate costs
    const functionCosts = new Map();

    for (const execution of executions) {
      if (!execution.functionId) continue;

      const functionId = execution.functionId._id.toString();
      
      if (!functionCosts.has(functionId)) {
        functionCosts.set(functionId, {
          _id: functionId,
          functionName: execution.functionId.name,
          totalCost: 0,
          executionCount: 0,
          totalDuration: 0,
          tier: 'basic',
          costBreakdown: {
            baseCost: 0,
            coldStartCost: 0,
            retryCost: 0,
            dataTransferCost: 0
          }
        });
      }

      const funcCost = functionCosts.get(functionId);
      
      // Calculate cost if not already stored or if stored cost is 0
      let costInfo;
      if (execution.cost && execution.cost.totalCost > 0) {
        costInfo = execution.cost;
      } else {
        // Recalculate cost using the cost service
        costInfo = costService.calculateExecutionCost(execution, execution.functionId);
        // Update the execution with the calculated cost
        execution.cost = costInfo;
        await execution.save();
      }

      funcCost.totalCost += costInfo.totalCost;
      funcCost.executionCount += 1;
      funcCost.totalDuration += execution.duration || 0;
      funcCost.tier = costInfo.tier;
      
      funcCost.costBreakdown.baseCost += costInfo.baseCost;
      funcCost.costBreakdown.coldStartCost += costInfo.coldStartCost;
      funcCost.costBreakdown.retryCost += costInfo.retryCost;
      funcCost.costBreakdown.dataTransferCost += costInfo.dataTransferCost;
    }

    // Convert to array and add calculated fields
    const breakdown = Array.from(functionCosts.values()).map(funcCost => ({
      ...funcCost,
      totalCost: parseFloat(funcCost.totalCost.toFixed(6)),
      averageCost: funcCost.executionCount > 0 ? parseFloat((funcCost.totalCost / funcCost.executionCount).toFixed(6)) : 0,
      averageDuration: funcCost.executionCount > 0 ? Math.round(funcCost.totalDuration / funcCost.executionCount) : 0,
      costBreakdown: {
        baseCost: parseFloat(funcCost.costBreakdown.baseCost.toFixed(6)),
        coldStartCost: parseFloat(funcCost.costBreakdown.coldStartCost.toFixed(6)),
        retryCost: parseFloat(funcCost.costBreakdown.retryCost.toFixed(6)),
        dataTransferCost: parseFloat(funcCost.costBreakdown.dataTransferCost.toFixed(6))
      }
    })).sort((a, b) => b.totalCost - a.totalCost);

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
