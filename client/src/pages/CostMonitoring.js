import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, Zap, Calendar, Filter } from 'lucide-react';
import { costsAPI } from '../services/api';
import CostChart from '../components/CostChart';
import CostMetricsCard from '../components/CostMetricsCard';
import CostBreakdown from '../components/CostBreakdown';

const CostMonitoring = () => {
  const [systemCosts, setSystemCosts] = useState(null);
  const [costTrends, setCostTrends] = useState([]);
  const [costBreakdown, setCostBreakdown] = useState([]);
  const [pricingInfo, setPricingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [granularity, setGranularity] = useState('hour');

  useEffect(() => {
    loadCostData();
  }, [dateRange, granularity]);

  const loadCostData = async () => {
    try {
      setLoading(true);
      const [systemRes, trendsRes, breakdownRes, pricingRes] = await Promise.all([
        costsAPI.getSystemCosts(dateRange.startDate, dateRange.endDate),
        costsAPI.getTrends(dateRange.startDate, dateRange.endDate, granularity),
        costsAPI.getBreakdown(dateRange.startDate, dateRange.endDate),
        costsAPI.getPricing()
      ]);

      setSystemCosts(systemRes.data.data);
      setCostTrends(trendsRes.data.data.trends);
      setCostBreakdown(breakdownRes.data.data.breakdown);
      setPricingInfo(pricingRes.data.data);
    } catch (error) {
      console.error('Error loading cost data:', error);
    } finally {
      setLoading(false);
    }
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
        </div>
        <div className="flex items-center space-x-4">
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
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="minute">Minute</option>
              <option value="hour">Hour</option>
              <option value="day">Day</option>
            </select>
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
      <CostBreakdown
        breakdown={costBreakdown}
        title="Cost Breakdown by Function"
      />

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
