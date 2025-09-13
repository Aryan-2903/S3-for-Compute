import React from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const CostChart = ({ data, type = 'line', title, height = 300 }) => {
  const getChartData = () => {
    switch (type) {
      case 'line':
        return {
          labels: data.map(item => item._id || item.label),
          datasets: [
            {
              label: 'Total Cost ($)',
              data: data.map(item => item.totalCost || item.value),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1,
            },
            {
              label: 'Execution Count',
              data: data.map(item => item.executionCount || 0),
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.1,
              yAxisID: 'y1',
            }
          ]
        };
      
      case 'bar':
        return {
          labels: data.map(item => item.functionName || item.label),
          datasets: [
            {
              label: 'Total Cost ($)',
              data: data.map(item => item.totalCost || item.value),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1,
            }
          ]
        };
      
      case 'pie':
        return {
          labels: data.map(item => item.functionName || item.label),
          datasets: [
            {
              data: data.map(item => item.totalCost || item.value),
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)',
              ],
              borderWidth: 1,
            }
          ]
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: !!title,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed;
            if (label.includes('Cost')) {
              return `${label}: $${value.toFixed(6)}`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: type === 'line' ? {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Cost ($)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Execution Count'
        },
        grid: {
          drawOnChartArea: false,
        },
      }
    } : {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cost ($)'
        }
      }
    }
  };

  const renderChart = () => {
    const chartData = getChartData();
    
    switch (type) {
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'bar':
        return <Bar data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No cost data available</p>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }}>
      {renderChart()}
    </div>
  );
};

export default CostChart;
