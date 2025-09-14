import React from 'react';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

const ScalingTimeline = ({ events }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-500">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <div>No scaling events yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-80 max-h-96 overflow-y-auto pr-2 border border-gray-200 rounded-lg bg-gray-50 scrollbar-thin">
      <div className="space-y-4 p-4">
        {events.map((event, index) => (
        <div key={event._id || index} className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              event.action === 'scale_up' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {event.action === 'scale_up' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`text-sm font-medium ${
                event.action === 'scale_up' ? 'text-green-800' : 'text-red-800'
              }`}>
                {event.action === 'scale_up' ? 'Scaled Up' : 'Scaled Down'}
              </span>
              <span className="text-sm text-gray-600">
                to {event.instanceCount} instance{event.instanceCount !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 mb-1">
              {event.reason && (
                <span className="block">Reason: {event.reason}</span>
              )}
            </div>
            
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{formatTime(event.timestamp)}</span>
            </div>
          </div>
        </div>
        ))}
      </div>
      {/* Fade effect at bottom to indicate more content */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default ScalingTimeline;
