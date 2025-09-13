import React, { useState, useEffect } from 'react';
import { Plus, Play, Trash2, Edit } from 'lucide-react';
import { functionsAPI } from '../services/api';
import FunctionUpload from '../components/FunctionUpload';
import FunctionList from '../components/FunctionList';
import ExecutionLogs from '../components/ExecutionLogs';

const Functions = () => {
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadFunctions();
  }, []);

  const loadFunctions = async () => {
    try {
      const res = await functionsAPI.getAll();
      setFunctions(res.data);
    } catch (error) {
      console.error('Error loading functions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFunctionCreated = (newFunction) => {
    setFunctions(prev => [newFunction, ...prev]);
    setShowUpload(false);
  };

  const handleExecuteFunction = async (functionId, input = {}) => {
    try {
      await functionsAPI.execute(functionId, input);
      // Show success message or update UI
    } catch (error) {
      console.error('Error executing function:', error);
    }
  };

  const handleDeleteFunction = async (functionId) => {
    if (window.confirm('Are you sure you want to delete this function?')) {
      try {
        await functionsAPI.delete(functionId);
        setFunctions(prev => prev.filter(f => f._id !== functionId));
      } catch (error) {
        console.error('Error deleting function:', error);
      }
    }
  };

  const handleViewLogs = (functionId) => {
    setSelectedFunction(functionId);
    setShowLogs(true);
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
          <h1 className="text-3xl font-bold text-gray-900">Functions</h1>
          <p className="text-gray-600 mt-2">Manage your serverless functions</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Function</span>
        </button>
      </div>

      {/* Functions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">All Functions</h2>
        </div>
        <div className="p-6">
          <FunctionList
            functions={functions}
            onExecute={handleExecuteFunction}
            onDelete={handleDeleteFunction}
            onViewLogs={handleViewLogs}
            showActions={true}
          />
        </div>
      </div>

      {/* Function Upload Modal */}
      {showUpload && (
        <FunctionUpload
          onClose={() => setShowUpload(false)}
          onSuccess={handleFunctionCreated}
        />
      )}

      {/* Execution Logs Modal */}
      {showLogs && selectedFunction && (
        <ExecutionLogs
          functionId={selectedFunction}
          onClose={() => {
            setShowLogs(false);
            setSelectedFunction(null);
          }}
        />
      )}
    </div>
  );
};

export default Functions;
