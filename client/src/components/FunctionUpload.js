import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { functionsAPI } from '../services/api';

const FunctionUpload = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    config: {
      timeout: 30000,
      retryCount: 3
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sampleFunctions = [
    {
      name: 'Fibonacci Calculator',
      description: 'Calculate the nth Fibonacci number',
      code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

return fibonacci(input.n || 10);`
    },
    {
      name: 'String Reverser',
      description: 'Reverse a string',
      code: `return input.text ? input.text.split('').reverse().join('') : 'No input provided';`
    },
    {
      name: 'Array Sum',
      description: 'Sum all numbers in an array',
      code: `const numbers = input.numbers || [];
return numbers.reduce((sum, num) => sum + (Number(num) || 0), 0);`
    },
    {
      name: 'Prime Checker',
      description: 'Check if a number is prime',
      code: `function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

return isPrime(input.number || 17);`
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await functionsAPI.create(formData);
      onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create function');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleSelect = (sample) => {
    setFormData({
      ...formData,
      name: sample.name,
      description: sample.description,
      code: sample.code
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Upload Function</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Sample Functions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quick Start - Select a sample function:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sampleFunctions.map((sample, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSampleSelect(sample)}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{sample.name}</div>
                  <div className="text-sm text-gray-600">{sample.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Function Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter function name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={formData.config.timeout}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, timeout: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="2"
              placeholder="Describe what this function does"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JavaScript Code *
            </label>
            <textarea
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows="12"
              placeholder="// Your JavaScript function code here
// Access input data via 'input' parameter
// Return the result

function myFunction(input) {
  // Your logic here
  return 'Hello, ' + (input.name || 'World') + '!';
}

return myFunction(input);"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retry Count
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={formData.config.retryCount}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, retryCount: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{loading ? 'Creating...' : 'Create Function'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FunctionUpload;
