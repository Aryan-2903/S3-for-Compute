import React, { useState, useEffect } from 'react';
import { Play, Plus, Activity, Zap, DollarSign } from 'lucide-react';
import { functionsAPI, metricsAPI, costsAPI } from '../services/api';
import FunctionUpload from '../components/FunctionUpload';
import FunctionList from '../components/FunctionList';
import MetricsCard from '../components/MetricsCard';
import CostChart from '../components/CostChart';

const Dashboard = () => {
  const [functions, setFunctions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [systemCosts, setSystemCosts] = useState(null);
  const [costTrends, setCostTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadMetrics, 5000); // Update metrics every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [functionsRes, metricsRes, costsRes, trendsRes] = await Promise.all([
        functionsAPI.getAll(),
        metricsAPI.getOverview(),
        costsAPI.getSystemCosts(),
        costsAPI.getTrends(undefined, undefined, 'hour')
      ]);
      setFunctions(functionsRes.data);
      setMetrics(metricsRes.data);
      setSystemCosts(costsRes.data.data);
      setCostTrends(trendsRes.data.data.trends);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const [metricsRes, costsRes] = await Promise.all([
        metricsAPI.getOverview(),
        costsAPI.getSystemCosts()
      ]);
      setMetrics(metricsRes.data);
      setSystemCosts(costsRes.data.data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleFunctionCreated = (newFunction) => {
    setFunctions(prev => [newFunction, ...prev]);
    setShowUpload(false);
  };

  const handleExecuteFunction = async (functionId, input = {}) => {
    try {
      await functionsAPI.execute(functionId, input);
      loadMetrics(); // Refresh metrics
    } catch (error) {
      console.error('Error executing function:', error);
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor your serverless functions and system performance</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Function</span>
        </button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricsCard
            title="Active Functions"
            value={metrics.overview.activeFunctions}
            icon={Zap}
            color="blue"
          />
          <MetricsCard
            title="Current Instances"
            value={metrics.overview.currentInstances}
            icon={Activity}
            color="green"
          />
          <MetricsCard
            title="Success Rate"
            value={`${metrics.overview.successRate}%`}
            icon={Play}
            color="purple"
          />
          <MetricsCard
            title="Pending Executions"
            value={metrics.overview.pendingExecutions}
            icon={Activity}
            color="orange"
          />
          {systemCosts && (
            <MetricsCard
              title="Total Cost (24h)"
              value={`$${systemCosts.totalSystemCost.toFixed(4)}`}
              icon={DollarSign}
              color="red"
            />
          )}
        </div>
      )}

      {/* Cost Trends Chart */}
      {costTrends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Trends (Last 24 Hours)</h2>
          <CostChart
            data={costTrends}
            type="line"
            height={300}
          />
        </div>
      )}

      {/* Recent Functions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Functions</h2>
        </div>
        <div className="p-6">
          <FunctionList
            functions={functions.slice(0, 5)}
            onExecute={handleExecuteFunction}
            showActions={true}
          />
        </div>
      </div>

      {/* Function Upload Modal */}
      {showUpload && (
        <FunctionUpload
          onClose={() => setShowUpload(false)}
          onSuccess={handleFunctionCreated}
        />
      )}
    </div>
  );
};

export default Dashboard;
