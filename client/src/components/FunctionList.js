import React, { useState } from 'react';
import { Play, Trash2, Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const FunctionList = ({ 
  functions, 
  onExecute, 
  onDelete, 
  onViewLogs, 
  showActions = false 
}) => {
  const [executing, setExecuting] = useState(new Set());

  const handleExecute = async (functionId, input = {}) => {
    setExecuting(prev => new Set(prev).add(functionId));
    try {
      await onExecute(functionId, input);
    } finally {
      setExecuting(prev => {
        const newSet = new Set(prev);
        newSet.delete(functionId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (functions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Play className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No functions yet</h3>
        <p className="text-gray-600">Upload your first function to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {functions.map((func) => (
        <div key={func._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{func.name}</h3>
                {getStatusIcon(func.status)}
                <span className={`px-2 py-1 text-xs rounded-full ${
                  func.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {func.status}
                </span>
              </div>
              
              <p className="text-gray-600 mb-3">{func.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Created {formatDate(func.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Timeout: {func.config.timeout}ms</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Retries: {func.config.retryCount}</span>
                </div>
              </div>
            </div>

            {showActions && (
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleExecute(func._id, { test: true })}
                  disabled={executing.has(func._id) || func.status !== 'active'}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {executing.has(func._id) ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  <span>{executing.has(func._id) ? 'Running...' : 'Run'}</span>
                </button>

                {onViewLogs && (
                  <button
                    onClick={() => onViewLogs(func._id)}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Logs</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => onDelete(func._id)}
                    className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Code Preview */}
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">Code Preview:</div>
            <pre className="text-sm text-gray-700 overflow-x-auto">
              {func.code.length > 200 
                ? func.code.substring(0, 200) + '...' 
                : func.code
              }
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FunctionList;
