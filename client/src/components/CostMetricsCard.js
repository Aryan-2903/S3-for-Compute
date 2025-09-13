import React from 'react';
import { DollarSign, TrendingUp, Clock, Zap } from 'lucide-react';

const CostMetricsCard = ({ title, value, icon: Icon, color = 'blue', subtitle, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val < 0.001) {
        return `$${val.toFixed(6)}`;
      } else if (val < 1) {
        return `$${val.toFixed(4)}`;
      } else {
        return `$${val.toFixed(2)}`;
      }
    }
    return val;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{formatValue(value)}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${
            trend > 0 ? 'text-red-600' : trend < 0 ? 'text-green-600' : 'text-gray-500'
          }`}>
            <TrendingUp className={`h-4 w-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default CostMetricsCard;
