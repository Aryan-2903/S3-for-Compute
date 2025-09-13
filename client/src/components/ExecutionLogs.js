import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { functionsAPI } from '../services/api';

const ExecutionLogs = ({ functionId, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [functionInfo, setFunctionInfo] = useState(null);

  useEffect(() => {
    loadData();
  }, [functionId]);

  const loadData = async () => {
    try {
      const [functionRes, logsRes] = await Promise.all([
        functionsAPI.getById(functionId),
        functionsAPI.getLogs(functionId, { limit: 100 })
      ]);
      
      setFunctionInfo(functionRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      console.error('Error loading execution logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RotateCcw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    return `${duration}ms`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Execution Logs
            </h2>
            {functionInfo && (
              <p className="text-gray-600 mt-1">{functionInfo.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Clock className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No executions yet</h3>
              <p className="text-gray-600">Execute this function to see logs here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(log.status)}
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                      {log.retryCount > 0 && (
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                          Retry {log.retryCount}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(log.startTime)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium">{formatDuration(log.duration)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Instance ID:</span>
                      <span className="ml-2 font-mono text-xs">{log.instanceId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">End Time:</span>
                      <span className="ml-2">{log.endTime ? formatDate(log.endTime) : 'N/A'}</span>
                    </div>
                  </div>

                  {log.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm font-medium text-red-800 mb-1">Error:</div>
                      <div className="text-sm text-red-700 font-mono">{log.error}</div>
                    </div>
                  )}

                  {log.output && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm font-medium text-green-800 mb-1">Output:</div>
                      <pre className="text-sm text-green-700 font-mono overflow-x-auto">
                        {typeof log.output === 'object' 
                          ? JSON.stringify(log.output, null, 2)
                          : String(log.output)
                        }
                      </pre>
                    </div>
                  )}

                  {log.input && Object.keys(log.input).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-sm font-medium text-gray-800 mb-1">Input:</div>
                      <pre className="text-sm text-gray-700 font-mono overflow-x-auto">
                        {JSON.stringify(log.input, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionLogs;
