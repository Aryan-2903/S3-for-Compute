import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, Clock, Zap, Calendar, RefreshCw } from 'lucide-react';
import { costsAPI } from '../services/api';
import CostChart from '../components/CostChart';
import CostMetricsCard from '../components/CostMetricsCard';
import CostBreakdown from '../components/CostBreakdown';
import websocketService from '../services/websocket';

const CostMonitoring = () => {
  const [systemCosts, setSystemCosts] = useState(null);
  const [costTrends, setCostTrends] = useState([]);
  const [costBreakdown, setCostBreakdown] = useState([]);
  const [pricingInfo, setPricingInfo] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Debug state changes
  useEffect(() => {
    console.log('🔄 SystemCosts state changed:', systemCosts);
  }, [systemCosts]);

  useEffect(() => {
    console.log('🔄 CostBreakdown state changed:', costBreakdown);
  }, [costBreakdown]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    endDate: new Date().toISOString().split('T')[0] // Today
  });

  const loadCostData = useCallback(async (isRefresh = false, customDateRange = null) => {
    try {
      // Use provided values or current state
      const currentDateRange = customDateRange || dateRange;
      
      console.log('💰 Loading cost data...', { isRefresh, currentDateRange });
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('📅 Using date range:', currentDateRange);
      
      const [systemRes, trendsRes, breakdownRes, pricingRes] = await Promise.all([
        costsAPI.getSystemCosts(currentDateRange.startDate, currentDateRange.endDate),
        costsAPI.getTrends(currentDateRange.startDate, currentDateRange.endDate, 'hour'), // Default to hour for trends
        costsAPI.getBreakdown(currentDateRange.startDate, currentDateRange.endDate),
        costsAPI.getPricing()
      ]);

      console.log('📊 Raw API responses:', {
        systemCosts: systemRes.data.data,
        trends: trendsRes.data.data.trends,
        breakdown: breakdownRes.data.data.breakdown
      });

      // Check if data has actually changed
      const newSystemCosts = systemRes.data.data;
      const newCostBreakdown = breakdownRes.data.data.breakdown;
      
      console.log('🔄 Data comparison:', {
        oldSystemCosts: systemCosts,
        newSystemCosts: newSystemCosts,
        oldBreakdownCount: costBreakdown.length,
        newBreakdownCount: newCostBreakdown.length,
        dataChanged: JSON.stringify(systemCosts) !== JSON.stringify(newSystemCosts)
      });

      setSystemCosts(newSystemCosts);
      setCostTrends(trendsRes.data.data.trends);
      setCostBreakdown(newCostBreakdown);
      setPricingInfo(pricingRes.data.data);
      setLastUpdate(new Date().toISOString());
      
      console.log('📊 Cost data loaded and state updated:', {
        systemCosts: systemRes.data.data,
        trendsCount: trendsRes.data.data.trends.length,
        breakdownCount: breakdownRes.data.data.breakdown.length
      });

    } catch (error) {
      console.error('Error loading cost data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, systemCosts, costBreakdown]);

  useEffect(() => {
    loadCostData();
  }, [dateRange]);

  // Set up WebSocket listeners for real-time updates
  const handleExecutionCompleted = useCallback((data) => {
    console.log('🔄 Execution completed, refreshing cost data:', data);
    console.log('🔄 Current state before refresh:', {
      systemCosts,
      costBreakdown: costBreakdown.length,
      costTrends: costTrends.length
    });
    // Refresh cost data when a new execution completes
    // Use current state values to avoid stale closure
    loadCostData(true, dateRange);
  }, [loadCostData, dateRange, systemCosts, costBreakdown, costTrends]);

  const handleExecutionStarted = useCallback((data) => {
    console.log('🚀 Execution started:', data);
  }, []);

  const handleWebSocketConnected = useCallback(() => {
    console.log('✅ WebSocket connected to cost monitoring');
  }, []);

  const handleWebSocketDisconnected = useCallback(() => {
    console.log('❌ WebSocket disconnected from cost monitoring');
  }, []);

  // Add a general message handler to see all WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    console.log('📡 WebSocket message received in CostMonitoring:', data);
  }, []);

  useEffect(() => {
    // Set up periodic refresh as fallback (every 30 seconds)
    const refreshInterval = setInterval(() => {
      console.log('🔄 Periodic refresh triggered');
      loadCostData(true);
    }, 30000);

    // Connect to WebSocket
    websocketService.connect();
    
    // Add event listeners
    websocketService.on('execution_completed', handleExecutionCompleted);
    websocketService.on('execution_started', handleExecutionStarted);
    websocketService.on('connected', handleWebSocketConnected);
    websocketService.on('disconnected', handleWebSocketDisconnected);
    
    // Add a catch-all message handler
    websocketService.on('message', handleWebSocketMessage);

    // Cleanup on unmount
    return () => {
      clearInterval(refreshInterval);
      websocketService.off('execution_completed', handleExecutionCompleted);
      websocketService.off('execution_started', handleExecutionStarted);
      websocketService.off('connected', handleWebSocketConnected);
      websocketService.off('disconnected', handleWebSocketDisconnected);
      websocketService.off('message', handleWebSocketMessage);
    };
  }, [handleExecutionCompleted, handleExecutionStarted, handleWebSocketConnected, handleWebSocketDisconnected, handleWebSocketMessage, loadCostData]); // Include all dependencies

  const handleRefresh = () => {
    loadCostData(true);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
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
          <h1 className="text-3xl font-bold text-gray-900">Cost Monitoring</h1>
          <p className="text-gray-600 mt-2">Track and analyze your serverless function costs</p>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Cost Overview Cards */}
      {systemCosts && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CostMetricsCard
            title="Total System Cost"
            value={systemCosts.totalSystemCost}
            icon={DollarSign}
            color="blue"
            subtitle={`${systemCosts.totalExecutions} executions`}
          />
          <CostMetricsCard
            title="Average Cost per Execution"
            value={systemCosts.averageCostPerExecution}
            icon={TrendingUp}
            color="green"
            subtitle="Per execution"
          />
          <CostMetricsCard
            title="Total Executions"
            value={systemCosts.totalExecutions}
            icon={Zap}
            color="purple"
            subtitle="In selected period"
          />
          <CostMetricsCard
            title="Most Expensive Function"
            value={systemCosts.functionCosts?.[0]?.totalCost || 0}
            icon={Clock}
            color="orange"
            subtitle={systemCosts.functionCosts?.[0]?.functionName || 'N/A'}
          />
        </div>
      )}

      {/* Cost Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trends Over Time</h3>
        <CostChart
          data={costTrends}
          type="line"
          height={400}
        />
      </div>

      {/* Cost Breakdown by Function */}
      <div className="relative">
        {refreshing && (
          <div className="absolute top-4 right-4 z-10 flex items-center space-x-2 text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Updating...</span>
          </div>
        )}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Tier Information</h4>
              <p className="text-sm text-blue-700 mt-1">
                The tiers shown below are determined by actual function characteristics (code length, timeout, etc.) during execution. 
              </p>
            </div>
          </div>
        </div>
        <CostBreakdown
          breakdown={costBreakdown}
          title="Cost Breakdown by Function"
        />
      </div>

      {/* Pricing Information */}
      {pricingInfo && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(pricingInfo.tiers).map(([tier, info]) => (
              <div key={tier} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 capitalize">{info.name}</h4>
                  <span className="text-sm text-gray-500">Tier</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Price per 100ms:</span>
                    <span className="text-sm font-medium">${info.pricePer100ms.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Memory:</span>
                    <span className="text-sm font-medium">{info.memoryMB}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">CPU Cores:</span>
                    <span className="text-sm font-medium">{info.cpuCores}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">{info.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CostMonitoring;
