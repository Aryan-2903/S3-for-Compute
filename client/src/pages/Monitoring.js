import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { metricsAPI, functionsAPI } from '../services/api';
import WebSocketService from '../services/websocket';
import MetricsCard from '../components/MetricsCard';
import ScalingChart from '../components/ScalingChart';
import ExecutionChart from '../components/ExecutionChart';
import ScalingTimeline from '../components/ScalingTimeline';
import LoadTester from '../components/LoadTester';

const Monitoring = () => {
  const [metrics, setMetrics] = useState(null);
  const [scalingHistory, setScalingHistory] = useState([]);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [functions, setFunctions] = useState([]);

  useEffect(() => {
    loadData();
    setupWebSocket();
    
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => {
      clearInterval(interval);
      WebSocketService.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      const [metricsRes, scalingRes, executionRes, functionsRes] = await Promise.all([
        metricsAPI.getOverview(),
        metricsAPI.getScalingHistory(24),
        metricsAPI.getExecutionHistory(24),
        functionsAPI.getAll()
      ]);
      
      setMetrics(metricsRes.data);
      setScalingHistory(scalingRes.data);
      setExecutionHistory(executionRes.data);
      setFunctions(functionsRes.data);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    WebSocketService.connect();
    
    WebSocketService.on('scaling_event', (data) => {
      console.log('Scaling event received:', data);
      const update = { ...data, type: 'scaling_event' };
      setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
      loadData(); // Refresh data
    });

    WebSocketService.on('execution_started', (data) => {
      const update = { ...data, type: 'execution_started' };
      setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]);
    });

    WebSocketService.on('execution_completed', (data) => {
      const update = { ...data, type: 'execution_completed' };
      setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]);
    });

    WebSocketService.on('execution_failed', (data) => {
      const update = { ...data, type: 'execution_failed' };
      setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Monitoring</h1>
        <p className="text-gray-600 mt-2">Real-time system metrics and scaling events</p>
      </div>

      {/* Real-time Updates */}
      {realTimeUpdates.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Real-time Updates</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {realTimeUpdates.map((update, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800">
                  {update.action === 'scale_up' && '📈 Scaled up'}
                  {update.action === 'scale_down' && '📉 Scaled down'}
                  {update.type === 'execution_started' && '🚀 Execution started'}
                  {update.type === 'execution_completed' && '✅ Execution completed'}
                  {update.type === 'execution_failed' && '❌ Execution failed'}
                </span>
                <span className="text-gray-600">
                  {update.timestamp ? new Date(update.timestamp).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricsCard
            title="Total Executions"
            value={metrics.overview.totalExecutions}
            icon={Activity}
            color="blue"
          />
          <MetricsCard
            title="Success Rate"
            value={`${metrics.overview.successRate}%`}
            icon={TrendingUp}
            color="green"
          />
          <MetricsCard
            title="Current Instances"
            value={metrics.overview.currentInstances}
            icon={Activity}
            color="purple"
          />
          <MetricsCard
            title="Failed Executions"
            value={metrics.overview.failedExecutions}
            icon={AlertCircle}
            color="red"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution History</h3>
          <ExecutionChart data={executionHistory} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Instance Scaling</h3>
          <ScalingChart data={scalingHistory} />
        </div>
      </div>

      {/* Scaling Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scaling Events Timeline</h3>
        <ScalingTimeline events={scalingHistory} />
      </div>

      {/* Load Testing */}
      <LoadTester 
        functions={functions} 
        onTestComplete={() => {
          loadData(); // Refresh metrics after test
        }}
      />
    </div>
  );
};

export default Monitoring;
