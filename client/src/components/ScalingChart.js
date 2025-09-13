import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ScalingChart = ({ data }) => {
  // Process scaling events to create timeline data
  const processData = () => {
    if (!data || data.length === 0) return [];

    // Group events by hour
    const hourlyData = {};
    
    data.forEach(event => {
      const hour = new Date(event.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit'
      });
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          time: hour,
          instances: 1,
          scaleUp: 0,
          scaleDown: 0
        };
      }
      
      if (event.action === 'scale_up') {
        hourlyData[hour].instances += 1;
        hourlyData[hour].scaleUp += 1;
      } else if (event.action === 'scale_down') {
        hourlyData[hour].instances = Math.max(1, hourlyData[hour].instances - 1);
        hourlyData[hour].scaleDown += 1;
      }
    });

    return Object.values(hourlyData).sort((a, b) => 
      new Date(a.time) - new Date(b.time)
    );
  };

  const chartData = processData();

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div>No scaling data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            domain={[0, 'dataMax + 1']}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value, name) => [
              value, 
              name === 'instances' ? 'Instances' : 
              name === 'scaleUp' ? 'Scale Up Events' : 'Scale Down Events'
            ]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="instances" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScalingChart;
