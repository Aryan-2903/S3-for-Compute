import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ExecutionChart = ({ data }) => {
  // Process execution data for the chart
  const processData = () => {
    if (!data || data.length === 0) return [];

    return data.map(item => ({
      time: `${item._id.month}/${item._id.day} ${item._id.hour}:00`,
      total: item.total,
      completed: item.completed,
      failed: item.failed,
      pending: item.total - item.completed - item.failed
    }));
  };

  const chartData = processData();

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <div>No execution data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value, name) => [
              value, 
              name === 'total' ? 'Total' :
              name === 'completed' ? 'Completed' :
              name === 'failed' ? 'Failed' : 
              name === 'pending' ? 'Pending' : name
            ]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Legend />
          <Bar dataKey="completed" stackId="a" fill="#10B981" name="Completed" />
          <Bar dataKey="failed" stackId="a" fill="#EF4444" name="Failed" />
          <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="Pending" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExecutionChart;
