const ScalingEvent = require('../models/ScalingEvent');
const Execution = require('../models/Execution');

class ScalingService {
  constructor() {
    this.wss = null;
    this.monitoringInterval = null;
    this.instanceCount = 1;
    this.scalingThreshold = 10;
    this.scaleDownThreshold = 3;
    this.scaleDownTime = 30000; // 30 seconds
    this.lastScaleDownCheck = Date.now();
  }

  setWebSocketServer(wss) {
    this.wss = wss;
  }

  startMonitoring() {
    console.log('🔄 Starting scaling monitoring service');
    
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

  getInstanceCount() {
    return this.instanceCount;
  }
}

module.exports = ScalingService;
