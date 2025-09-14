const Execution = require('../models/Execution');
const Function = require('../models/Function');

class CostService {
  constructor() {
    // Pricing tiers (per 100ms of execution time)
    this.pricingTiers = {
      basic: {
        name: 'Basic',
        pricePer100ms: 0.0001, // $0.0001 per 100ms
        memoryMB: 128,
        cpuCores: 0.1,
        description: 'Lightweight functions with minimal resource requirements'
      },
      standard: {
        name: 'Standard',
        pricePer100ms: 0.0003, // $0.0003 per 100ms
        memoryMB: 512,
        cpuCores: 0.5,
        description: 'Standard functions with moderate resource usage'
      },
      premium: {
        name: 'Premium',
        pricePer100ms: 0.0008, // $0.0008 per 100ms
        memoryMB: 1024,
        cpuCores: 1.0,
        description: 'High-performance functions with significant resource requirements'
      },
      enterprise: {
        name: 'Enterprise',
        pricePer100ms: 0.002, // $0.002 per 100ms
        memoryMB: 2048,
        cpuCores: 2.0,
        description: 'Enterprise-grade functions with maximum resources'
      }
    };

    // Additional cost factors
    this.costFactors = {
      coldStart: 0.00005, // $0.00005 per cold start
      retry: 0.00002, // $0.00002 per retry attempt
      scaling: 0.0001, // $0.0001 per scaling event
      dataTransfer: 0.000001, // $0.000001 per KB of data transfer
      storage: 0.0001 // $0.0001 per MB per hour of storage
    };
  }

  /**
   * Calculate cost for a single execution
   * @param {Object} execution - Execution object
   * @param {Object} func - Function object
   * @returns {Object} Cost breakdown
   */
  calculateExecutionCost(execution, func) {
    const tier = this.determineTier(func);
    const duration = execution.duration || 0; // in milliseconds
    const durationIn100ms = Math.ceil(duration / 100); // Round up to next 100ms
    
    // Base execution cost
    const baseCost = durationIn100ms * this.pricingTiers[tier].pricePer100ms;
    
    // Additional costs
    const coldStartCost = execution.retryCount === 0 ? this.costFactors.coldStart : 0;
    const retryCost = execution.retryCount * this.costFactors.retry;
    const dataTransferCost = this.calculateDataTransferCost(execution);
    
    const totalCost = baseCost + coldStartCost + retryCost + dataTransferCost;
    
    return {
      tier,
      baseCost: parseFloat(baseCost.toFixed(6)),
      coldStartCost: parseFloat(coldStartCost.toFixed(6)),
      retryCost: parseFloat(retryCost.toFixed(6)),
      dataTransferCost: parseFloat(dataTransferCost.toFixed(6)),
      totalCost: parseFloat(totalCost.toFixed(6)),
      duration: duration,
      durationIn100ms,
      resourceUsage: {
        memoryMB: this.pricingTiers[tier].memoryMB,
        cpuCores: this.pricingTiers[tier].cpuCores
      }
    };
  }

  /**
   * Determine pricing tier based on function characteristics
   * @param {Object} func - Function object
   * @returns {String} Tier name
   */
  determineTier(func) {
    const codeLength = func.code ? func.code.length : 0;
    const timeout = func.config?.timeout || 30000;
    
    // More realistic heuristic based on code complexity and timeout
    // Prioritize code length over timeout for tier determination
    if (codeLength > 10000 || timeout > 120000) {
      return 'enterprise';
    } else if (codeLength > 5000 || timeout > 60000) {
      return 'premium';
    } else if (codeLength > 100 || timeout > 60000) {
      return 'standard'; // Medium code (101-5000 chars) OR long timeout (>60s)
    } else {
      return 'basic'; // Small code (≤100 chars) and reasonable timeout (≤60s)
    }
  }

  /**
   * Calculate data transfer cost based on input/output size
   * @param {Object} execution - Execution object
   * @returns {Number} Data transfer cost
   */
  calculateDataTransferCost(execution) {
    const inputSize = this.getDataSize(execution.input);
    const outputSize = this.getDataSize(execution.output);
    const totalSizeKB = (inputSize + outputSize) / 1024;
    
    return totalSizeKB * this.costFactors.dataTransfer;
  }

  /**
   * Get approximate data size in bytes
   * @param {*} data - Data to measure
   * @returns {Number} Size in bytes
   */
  getDataSize(data) {
    if (data === null || data === undefined) return 0;
    return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
  }

  /**
   * Calculate total cost for a function over a time period
   * @param {String} functionId - Function ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Cost summary
   */
  async calculateFunctionCosts(functionId, startDate, endDate) {
    const executions = await Execution.find({
      functionId,
      startTime: { $gte: startDate, $lte: endDate }
    }).populate('functionId');

    const func = await Function.findById(functionId);
    if (!func) {
      throw new Error('Function not found');
    }

    let totalCost = 0;
    let executionCount = 0;
    let totalDuration = 0;
    const costBreakdown = {
      baseCost: 0,
      coldStartCost: 0,
      retryCost: 0,
      dataTransferCost: 0
    };

    for (const execution of executions) {
      const cost = this.calculateExecutionCost(execution, func);
      totalCost += cost.totalCost;
      executionCount++;
      totalDuration += execution.duration || 0;
      
      costBreakdown.baseCost += cost.baseCost;
      costBreakdown.coldStartCost += cost.coldStartCost;
      costBreakdown.retryCost += cost.retryCost;
      costBreakdown.dataTransferCost += cost.dataTransferCost;
    }

    return {
      functionId,
      functionName: func.name,
      period: { startDate, endDate },
      totalCost: parseFloat(totalCost.toFixed(6)),
      executionCount,
      averageCost: executionCount > 0 ? parseFloat((totalCost / executionCount).toFixed(6)) : 0,
      totalDuration,
      averageDuration: executionCount > 0 ? Math.round(totalDuration / executionCount) : 0,
      costBreakdown: {
        baseCost: parseFloat(costBreakdown.baseCost.toFixed(6)),
        coldStartCost: parseFloat(costBreakdown.coldStartCost.toFixed(6)),
        retryCost: parseFloat(costBreakdown.retryCost.toFixed(6)),
        dataTransferCost: parseFloat(costBreakdown.dataTransferCost.toFixed(6))
      },
      tier: this.determineTier(func)
    };
  }

  /**
   * Calculate system-wide costs
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} System cost summary
   */
  async calculateSystemCosts(startDate, endDate) {
    const executions = await Execution.find({
      startTime: { $gte: startDate, $lte: endDate }
    }).populate('functionId');

    const functionCosts = new Map();
    let totalSystemCost = 0;
    let totalExecutions = 0;

    for (const execution of executions) {
      if (!execution.functionId) continue;
      
      const cost = this.calculateExecutionCost(execution, execution.functionId);
      
      if (!functionCosts.has(execution.functionId._id.toString())) {
        functionCosts.set(execution.functionId._id.toString(), {
          functionId: execution.functionId._id,
          functionName: execution.functionId.name,
          totalCost: 0,
          executionCount: 0,
          tier: cost.tier
        });
      }
      
      const funcCost = functionCosts.get(execution.functionId._id.toString());
      funcCost.totalCost += cost.totalCost;
      funcCost.executionCount++;
      
      totalSystemCost += cost.totalCost;
      totalExecutions++;
    }

    return {
      period: { startDate, endDate },
      totalSystemCost: parseFloat(totalSystemCost.toFixed(6)),
      totalExecutions,
      averageCostPerExecution: totalExecutions > 0 ? parseFloat((totalSystemCost / totalExecutions).toFixed(6)) : 0,
      functionCosts: Array.from(functionCosts.values()).map(fc => ({
        ...fc,
        totalCost: parseFloat(fc.totalCost.toFixed(6))
      }))
    };
  }

  /**
   * Get cost estimation for a function before execution
   * @param {Object} func - Function object
   * @param {Object} input - Input data
   * @param {Number} estimatedDuration - Estimated duration in ms
   * @returns {Object} Cost estimation
   */
  estimateExecutionCost(func, input, estimatedDuration = 1000) {
    const tier = this.determineTier(func);
    const durationIn100ms = Math.ceil(estimatedDuration / 100);
    
    const baseCost = durationIn100ms * this.pricingTiers[tier].pricePer100ms;
    const coldStartCost = this.costFactors.coldStart;
    const dataTransferCost = this.calculateDataTransferCost({ input, output: null });
    
    const estimatedCost = baseCost + coldStartCost + dataTransferCost;
    
    return {
      tier,
      estimatedCost: parseFloat(estimatedCost.toFixed(6)),
      estimatedDuration,
      resourceUsage: {
        memoryMB: this.pricingTiers[tier].memoryMB,
        cpuCores: this.pricingTiers[tier].cpuCores
      },
      breakdown: {
        baseCost: parseFloat(baseCost.toFixed(6)),
        coldStartCost: parseFloat(coldStartCost.toFixed(6)),
        dataTransferCost: parseFloat(dataTransferCost.toFixed(6))
      }
    };
  }

  /**
   * Get pricing information
   * @returns {Object} Pricing tiers and factors
   */
  getPricingInfo() {
    return {
      tiers: this.pricingTiers,
      factors: this.costFactors
    };
  }
}

module.exports = CostService;
