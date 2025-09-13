const { Worker, isMainThread, parentPort } = require('worker_threads');
const Execution = require('../models/Execution');
const ScalingEvent = require('../models/ScalingEvent');
const CostService = require('./costService');
const { v4: uuidv4 } = require('uuid');

class ExecutionEngine {
  constructor() {
    this.activeExecutions = new Map();
    this.executionQueue = [];
    this.maxConcurrentExecutions = 10;
    this.wss = null;
    this.instanceCount = 1;
    this.scalingThreshold = 10;
    this.scaleDownThreshold = 3;
    this.scaleDownTime = 30000; // 30 seconds
    this.lastScaleDownCheck = Date.now();
    this.costService = new CostService();
  }

  setWebSocketServer(wss) {
    this.wss = wss;
  }

  async executeFunction(func, input) {
    const execution = new Execution({
      functionId: func._id,
      input,
      status: 'pending',
      instanceId: uuidv4()
    });

    await execution.save();
    
    // Add to queue
    this.executionQueue.push(execution);
    
    // Check if we need to scale up
    await this.checkScaling();
    
    // Process queue
    this.processQueue();
    
    return execution;
  }

  async processQueue() {
    if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
      return; // Wait for current executions to complete
    }

    const execution = this.executionQueue.shift();
    if (!execution) {
      return;
    }

    this.activeExecutions.set(execution._id, execution);
    
    try {
      await this.runExecution(execution);
    } catch (error) {
      console.error('Execution error:', error);
    }
  }

  async runExecution(execution) {
    const func = await require('../models/Function').findById(execution.functionId);
    
    execution.status = 'running';
    execution.startTime = new Date();
    await execution.save();

    this.broadcastUpdate('execution_started', {
      executionId: execution._id,
      functionId: execution.functionId,
      status: 'running'
    });

    try {
      // Create a worker thread to execute the function
      const result = await this.executeInWorker(func.code, execution.input, execution.instanceId);
      
      execution.status = 'completed';
      execution.output = result;
      execution.endTime = new Date();
      
      // Calculate and store cost information
      const costInfo = this.costService.calculateExecutionCost(execution, func);
      execution.cost = costInfo;
      
      await execution.save();

      this.broadcastUpdate('execution_completed', {
        executionId: execution._id,
        functionId: execution.functionId,
        status: 'completed',
        duration: execution.duration,
        output: result,
        cost: costInfo
      });

    } catch (error) {
      await this.handleExecutionError(execution, error);
    } finally {
      this.activeExecutions.delete(execution._id);
      this.processQueue(); // Process next in queue
    }
  }

  async executeInWorker(code, input, instanceId) {
    return new Promise((resolve, reject) => {
      const workerCode = `
        const { parentPort } = require('worker_threads');
        
        try {
          // Create a safe execution context
          const userCode = ${JSON.stringify(code)};
          const input = ${JSON.stringify(input)};
          const instanceId = ${JSON.stringify(instanceId)};
          
          // Check if the code has standalone return statements (not inside a function)
          const hasStandaloneReturn = /^\\s*return\\s+/.test(userCode.trim()) || 
                                    /\\n\\s*return\\s+/.test(userCode) ||
                                    (userCode.includes('function ') && /\\n\\s*return\\s+/.test(userCode));
          
          let func;
          let result;
          
          if (hasStandaloneReturn) {
            // Code has standalone return statements, wrap everything in a function
            func = new Function('input', 'instanceId', 
              \`try {
                \${userCode}
              } catch (error) {
                throw new Error('Function execution error: ' + error.message);
              }\`
            );
            
            result = func(input, instanceId);
            parentPort.postMessage({ success: true, result });
          } else if (userCode.trim().startsWith('function ') || userCode.trim().startsWith('const ') || userCode.trim().startsWith('let ') || userCode.trim().startsWith('var ')) {
            // It's a complete function definition, evaluate it directly
            // Create a context with input and instanceId available
            const context = { input, instanceId };
            
            // Use Function constructor to create a function with the context
            const wrappedCode = \`
              const input = arguments[0];
              const instanceId = arguments[1];
              \${userCode}
              
              // Try to find the function name or use a default pattern
              const functionMatch = \${JSON.stringify(userCode)}.match(/(?:function\\\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|(?:const|let|var)\\\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\\\s*=)/);
              const functionName = functionMatch ? (functionMatch[1] || functionMatch[2]) : 'main';
              
              // Get the function from the local scope
              let targetFunction;
              try {
                targetFunction = eval(functionName);
              } catch (e) {
                // Function might be declared as const/let/var
                targetFunction = this[functionName] || eval(functionName);
              }
              
              if (typeof targetFunction !== 'function') {
                throw new Error('Code does not define a valid function: ' + functionName);
              }
              
              // Call the function with input and instanceId
              return targetFunction(input, instanceId);
            \`;
            
            const executor = new Function(wrappedCode);
            result = executor(input, instanceId);
            parentPort.postMessage({ success: true, result });
          } else {
            // It's just function body, wrap it in a function with input and instanceId in scope
            func = new Function('input', 'instanceId', 
              \`try {
                \${userCode}
              } catch (error) {
                throw new Error('Function execution error: ' + error.message);
              }\`
            );
            
            result = func(input, instanceId);
            parentPort.postMessage({ success: true, result });
          }
        } catch (error) {
          parentPort.postMessage({ success: false, error: error.message });
        }
      `;

      const worker = new Worker(workerCode, { eval: true });
      
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Function execution timeout'));
      }, 30000); // 30 second timeout

      worker.on('message', (message) => {
        clearTimeout(timeout);
        worker.terminate();
        
        if (message.success) {
          resolve(message.result);
        } else {
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async handleExecutionError(execution, error) {
    execution.retryCount += 1;
    
    if (execution.retryCount <= 3) {
      // Retry with exponential backoff
      const delay = Math.pow(2, execution.retryCount) * 1000; // 2s, 4s, 8s
      
      setTimeout(async () => {
        try {
          await this.runExecution(execution);
        } catch (retryError) {
          await this.handleExecutionError(execution, retryError);
        }
      }, delay);

      this.broadcastUpdate('execution_retry', {
        executionId: execution._id,
        functionId: execution.functionId,
        retryCount: execution.retryCount,
        delay
      });

    } else {
      // Max retries exceeded, mark as failed
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
      await execution.save();

      this.broadcastUpdate('execution_failed', {
        executionId: execution._id,
        functionId: execution.functionId,
        status: 'failed',
        error: error.message,
        retryCount: execution.retryCount
      });
    }
  }

  async checkScaling() {
    const queueLength = this.executionQueue.length;
    const activeCount = this.activeExecutions.size;
    const totalPending = queueLength + activeCount;

    // Scale up if queue is getting long
    if (totalPending > this.scalingThreshold && this.instanceCount < 10) {
      await this.scaleUp(totalPending);
    }

    // Check for scale down
    const now = Date.now();
    if (now - this.lastScaleDownCheck > this.scaleDownTime) {
      if (totalPending < this.scaleDownThreshold && this.instanceCount > 1) {
        await this.scaleDown(totalPending);
      }
      this.lastScaleDownCheck = now;
    }
  }

  async scaleUp(reason) {
    this.instanceCount += 1;
    
    const scalingEvent = new ScalingEvent({
      functionId: null, // System-wide scaling
      action: 'scale_up',
      instanceCount: this.instanceCount,
      reason: `Queue length: ${reason}`
    });

    await scalingEvent.save();

    this.broadcastUpdate('scaling_event', {
      action: 'scale_up',
      instanceCount: this.instanceCount,
      reason: `Queue length: ${reason}`,
      timestamp: scalingEvent.timestamp
    });

    console.log(`📈 Scaled up to ${this.instanceCount} instances (reason: ${reason})`);
  }

  async scaleDown(reason) {
    this.instanceCount -= 1;
    
    const scalingEvent = new ScalingEvent({
      functionId: null, // System-wide scaling
      action: 'scale_down',
      instanceCount: this.instanceCount,
      reason: `Low load: ${reason}`
    });

    await scalingEvent.save();

    this.broadcastUpdate('scaling_event', {
      action: 'scale_down',
      instanceCount: this.instanceCount,
      reason: `Low load: ${reason}`,
      timestamp: scalingEvent.timestamp
    });

    console.log(`📉 Scaled down to ${this.instanceCount} instances (reason: ${reason})`);
  }

  broadcastUpdate(type, data) {
    if (this.wss) {
      const message = JSON.stringify({ type, data, timestamp: new Date() });
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
    }
  }

  getStats() {
    return {
      activeExecutions: this.activeExecutions.size,
      queueLength: this.executionQueue.length,
      instanceCount: this.instanceCount,
      maxConcurrentExecutions: this.maxConcurrentExecutions
    };
  }
}

module.exports = ExecutionEngine;