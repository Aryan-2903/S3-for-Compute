import React from 'react';
import { DollarSign, Clock, Zap, Database, RefreshCw } from 'lucide-react';

const CostBreakdown = ({ breakdown, title = "Cost Breakdown" }) => {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">No cost data available</p>
        </div>
      </div>
    );
  }

  const formatCost = (cost) => {
    if (cost < 0.001) {
      return `$${cost.toFixed(6)}`;
    } else if (cost < 1) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(2)}`;
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${(ms / 60000).toFixed(1)}m`;
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'basic': return 'text-blue-600 bg-blue-100';
      case 'standard': return 'text-green-600 bg-green-100';
      case 'premium': return 'text-orange-600 bg-orange-100';
      case 'enterprise': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Function
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Executions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost Breakdown
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {breakdown.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {item.functionName || 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(item.tier)}`}>
                    {item.tier?.toUpperCase() || 'BASIC'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                    {formatCost(item.totalCost)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.executionCount || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    {formatDuration(item.averageDuration || 0)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="space-y-1">
                    {item.costBreakdown && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Database className="h-3 w-3 mr-1" />
                            Base:
                          </span>
                          <span>{formatCost(item.costBreakdown.baseCost || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Zap className="h-3 w-3 mr-1" />
                            Cold Start:
                          </span>
                          <span>{formatCost(item.costBreakdown.coldStartCost || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry:
                          </span>
                          <span>{formatCost(item.costBreakdown.retryCost || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Database className="h-3 w-3 mr-1" />
                            Data:
                          </span>
                          <span>{formatCost(item.costBreakdown.dataTransferCost || 0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CostBreakdown;
