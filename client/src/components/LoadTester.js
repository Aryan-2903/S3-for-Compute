import React, { useState } from 'react';
import { Play, Square, Zap, BarChart3, DollarSign } from 'lucide-react';
import { functionsAPI, costsAPI } from '../services/api';

const LoadTester = ({ functions, onTestComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [selectedFunction, setSelectedFunction] = useState('');
  const [concurrentRequests, setConcurrentRequests] = useState(20);
  const [testDuration, setTestDuration] = useState(30); // seconds
  const [costEstimate, setCostEstimate] = useState(null);

  const runLoadTest = async () => {
    if (!selectedFunction) return;

    setIsRunning(true);
    setProgress(0);
    setResults(null);

    const startTime = Date.now();
    const endTime = startTime + (testDuration * 1000);
    const requests = [];
    const results_data = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      responseTimes: [],
      scalingEvents: [],
      costs: []
    };

    // Create concurrent requests
    const createRequest = async (requestId) => {
      try {
        const requestStart = Date.now();
        const response = await functionsAPI.execute(selectedFunction, { 
          testId: requestId,
          timestamp: new Date().toISOString()
        });
        const requestEnd = Date.now();
        const duration = requestEnd - requestStart;
        
        results_data.completed++;
        results_data.responseTimes.push(duration);
        
        // Calculate cost for this execution (client-side calculation)
        const calculateCost = (duration) => {
          // Basic tier pricing: $0.0001 per 100ms
          const durationIn100ms = Math.ceil(duration / 100);
          const baseCost = durationIn100ms * 0.0001;
          const coldStartCost = 0.00005; // $0.00005 per cold start
          const dataTransferCost = 0.000001; // Minimal data transfer cost
          
          return {
            totalCost: baseCost + coldStartCost + dataTransferCost,
            tier: 'basic',
            breakdown: {
              baseCost: baseCost,
              coldStartCost: coldStartCost,
              dataTransferCost: dataTransferCost
            }
          };
        };

        const costData = calculateCost(duration);
        results_data.costs.push({
          requestId,
          cost: costData,
          duration
        });
      } catch (error) {
        results_data.failed++;
        results_data.errors.push({
          requestId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      results_data.total++;
    };

    // Start concurrent requests
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(createRequest(i));
    }

    // Update progress
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / (testDuration * 1000)) * 100, 100);
      setProgress(progressPercent);
    }, 1000);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration * 1000));

    // Wait for all requests to complete
    await Promise.allSettled(requests);

    clearInterval(progressInterval);

    // Calculate statistics
    const avgResponseTime = results_data.responseTimes.length > 0 
      ? results_data.responseTimes.reduce((a, b) => a + b, 0) / results_data.responseTimes.length 
      : 0;

    const successRate = results_data.total > 0 
      ? (results_data.completed / results_data.total) * 100 
      : 0;

    // Calculate total cost
    const totalCost = results_data.costs.reduce((sum, cost) => sum + (cost.cost.totalCost || 0), 0);
    const avgCostPerRequest = results_data.costs.length > 0 ? totalCost / results_data.costs.length : 0;
    const costPerSecond = totalCost / testDuration;

    const testResults = {
      ...results_data,
      avgResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      testDuration: testDuration,
      concurrentRequests: concurrentRequests,
      requestsPerSecond: Math.round(results_data.total / testDuration * 100) / 100,
      totalCost: parseFloat(totalCost.toFixed(6)),
      avgCostPerRequest: parseFloat(avgCostPerRequest.toFixed(6)),
      costPerSecond: parseFloat(costPerSecond.toFixed(6))
    };

    setResults(testResults);
    setIsRunning(false);
    setProgress(100);

    if (onTestComplete) {
      onTestComplete(testResults);
    }
  };

  const stopTest = () => {
    setIsRunning(false);
    setProgress(0);
  };

  const activeFunctions = functions.filter(f => f.status === 'active');

  // Calculate cost estimate when parameters change
  React.useEffect(() => {
    if (selectedFunction && concurrentRequests && testDuration) {
      // Estimate cost based on average response time and parameters
      const estimatedRequests = concurrentRequests * (testDuration / 10); // Rough estimate
      const estimatedDuration = 1000; // Assume 1 second average execution time
      const durationIn100ms = Math.ceil(estimatedDuration / 100);
      const baseCost = durationIn100ms * 0.0001;
      const coldStartCost = 0.00005;
      const dataTransferCost = 0.000001;
      const costPerRequest = baseCost + coldStartCost + dataTransferCost;
      const estimatedCost = estimatedRequests * costPerRequest;
      
      setCostEstimate({
        estimatedRequests: Math.round(estimatedRequests),
        estimatedCost: parseFloat(estimatedCost.toFixed(6))
      });
    }
  }, [selectedFunction, concurrentRequests, testDuration]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Zap className="h-6 w-6 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">Load Testing</h3>
      </div>

      {activeFunctions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No active functions available for testing</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Function to Test
              </label>
              <select
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isRunning}
              >
                <option value="">Select a function</option>
                {activeFunctions.map(func => (
                  <option key={func._id} value={func._id}>
                    {func.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concurrent Requests
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={concurrentRequests}
                onChange={(e) => setConcurrentRequests(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isRunning}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Duration (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={testDuration}
                onChange={(e) => setTestDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isRunning}
              />
            </div>
          </div>

          {/* Cost Estimate */}
          {costEstimate && selectedFunction && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-semibold text-blue-900">Estimated Test Cost</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Estimated Requests:</span>
                  <span className="ml-2 font-medium">{costEstimate.estimatedRequests}</span>
                </div>
                <div>
                  <span className="text-blue-700">Estimated Cost:</span>
                  <span className="ml-2 font-medium">${costEstimate.estimatedCost}</span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                * This is a rough estimate using Basic tier pricing ($0.0001 per 100ms). Actual costs may vary based on execution time and pricing tier.
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {isRunning && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Test Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Test Controls */}
          <div className="flex space-x-3">
            {!isRunning ? (
              <button
                onClick={runLoadTest}
                disabled={!selectedFunction}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="h-4 w-4" />
                <span>Start Load Test</span>
              </button>
            ) : (
              <button
                onClick={stopTest}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square className="h-4 w-4" />
                <span>Stop Test</span>
              </button>
            )}
          </div>

          {/* Test Results */}
          {results && (
            <div className="border-t pt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                  <div className="text-sm text-blue-800">Total Requests</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.completed}</div>
                  <div className="text-sm text-green-800">Completed</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-red-800">Failed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{results.successRate}%</div>
                  <div className="text-sm text-purple-800">Success Rate</div>
                </div>
              </div>

              {/* Cost Results */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  <h5 className="text-lg font-semibold text-yellow-900">Test Cost Analysis</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-2xl font-bold text-yellow-600">${results.totalCost}</div>
                    <div className="text-sm text-yellow-800">Total Cost</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-lg font-semibold text-yellow-600">${results.avgCostPerRequest}</div>
                    <div className="text-sm text-yellow-800">Avg Cost per Request</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-lg font-semibold text-yellow-600">${results.costPerSecond}</div>
                    <div className="text-sm text-yellow-800">Cost per Second</div>
                  </div>
                </div>
                {costEstimate && (
                  <div className="mt-3 text-sm text-yellow-700">
                    <span>Estimated vs Actual: </span>
                    <span className="font-medium">
                      ${costEstimate.estimatedCost} → ${results.totalCost}
                      {costEstimate.estimatedCost > 0 && (
                        <span className="ml-2">
                          ({((results.totalCost - costEstimate.estimatedCost) / costEstimate.estimatedCost * 100).toFixed(1)}% difference)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">{results.avgResponseTime}ms</div>
                  <div className="text-sm text-gray-600">Average Response Time</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">{results.requestsPerSecond}</div>
                  <div className="text-sm text-gray-600">Requests per Second</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">{results.testDuration}s</div>
                  <div className="text-sm text-gray-600">Test Duration</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="mt-6">
                  <h5 className="text-md font-semibold text-gray-900 mb-2">Errors ({results.errors.length})</h5>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    {results.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-red-700 mb-1">
                        Request {error.requestId}: {error.error}
                      </div>
                    ))}
                    {results.errors.length > 5 && (
                      <div className="text-sm text-red-600 italic">
                        ... and {results.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoadTester;
