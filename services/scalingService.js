const ScalingEvent = require('../models/ScalingEvent');
const Execution = require('../models/Execution');

class ScalingService {
  constructor() {
    this.wss = null;
    this.monitoringInterval = null;
    this.instanceCount = 1;
    this.scalingThreshold = 5; // Lower threshold for more active scaling
    this.scaleDownThreshold = 2;
    this.scaleDownTime = 30000; // 30 seconds
    this.lastScaleDownCheck = Date.now();
    this.initialized = false;
  }

  setWebSocketServer(wss) {
    this.wss = wss;
  }

  startMonitoring() {
    console.log('🔄 Starting scaling monitoring service');
    
    // Initialize with some sample data if no scaling events exist
    this.initializeScalingData();
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkScaling();
    }, 5000); // Check every 5 seconds
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async initializeScalingData() {
    if (this.initialized) return;
    
    try {
      const existingEvents = await ScalingEvent.countDocuments();
      
      if (existingEvents === 0) {
        console.log('📊 Creating initial scaling events for demo');
        
        // Create some sample scaling events for demonstration
        const now = new Date();
        const sampleEvents = [
          {
            functionId: null,
            action: 'scale_up',
            instanceCount: 2,
            reason: 'Initial load detected',
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
          },
          {
            functionId: null,
            action: 'scale_up',
            instanceCount: 3,
            reason: 'High demand period',
            timestamp: new Date(now.getTime() - 90 * 60 * 1000) // 90 minutes ago
          },
          {
            functionId: null,
            action: 'scale_down',
            instanceCount: 2,
            reason: 'Load normalized',
            timestamp: new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
          }
        ];
        
        await ScalingEvent.insertMany(sampleEvents);
        this.instanceCount = 2; // Set current instance count
        console.log('✅ Initial scaling events created');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing scaling data:', error);
    }
  }

  async checkScaling() {
    try {
      const pendingExecutions = await Execution.countDocuments({
        status: { $in: ['pending', 'running'] }
      });

      // Scale up if queue is getting long
      if (pendingExecutions > this.scalingThreshold && this.instanceCount < 10) {
        await this.scaleUp(pendingExecutions);
      }

      // Check for scale down
      const now = Date.now();
      if (now - this.lastScaleDownCheck > this.scaleDownTime) {
        if (pendingExecutions < this.scaleDownThreshold && this.instanceCount > 1) {
          await this.scaleDown(pendingExecutions);
        }
        this.lastScaleDownCheck = now;
      }
    } catch (error) {
      console.error('Scaling check error:', error);
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

  async getInstanceCount() {
    try {
      // Get the latest scaling event to determine current instance count
      const latestEvent = await ScalingEvent.findOne().sort({ timestamp: -1 });
      if (latestEvent) {
        this.instanceCount = latestEvent.instanceCount;
      }
      return this.instanceCount;
    } catch (error) {
      console.error('Error getting instance count:', error);
      return this.instanceCount;
    }
  }
}

module.exports = ScalingService;
