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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm transform transition-all duration-300 hover:shadow-md">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-blue-900">Estimated Test Cost</h4>
                  <p className="text-sm text-blue-600">Pre-test cost estimation</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Estimated Requests</p>
                      <p className="text-2xl font-bold text-blue-900">{costEstimate.estimatedRequests}</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Estimated Cost</p>
                      <p className="text-2xl font-bold text-green-600">${costEstimate.estimatedCost}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs text-amber-700">
                    <span className="font-medium">Note:</span> This is a rough estimate using Basic tier pricing ($0.0001 per 100ms). 
                    Actual costs may vary based on execution time and pricing tier.
                  </p>
                </div>
              </div>
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
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6 shadow-sm transform transition-all duration-300 hover:shadow-md">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-semibold text-green-900">Test Cost Analysis</h5>
                    <p className="text-sm text-green-600">Actual costs from load testing</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Cost</p>
                        <p className="text-2xl font-bold text-green-600">${results.totalCost}</p>
                      </div>
                      <div className="p-2 bg-green-50 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Cost per Request</p>
                        <p className="text-lg font-bold text-green-600">${results.avgCostPerRequest}</p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Cost per Second</p>
                        <p className="text-lg font-bold text-green-600">${results.costPerSecond}</p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                {costEstimate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-900">Estimate vs Actual Comparison</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-700">Estimated:</span>
                        <span className="font-semibold text-blue-900">${costEstimate.estimatedCost}</span>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-700">Actual:</span>
                        <span className="font-semibold text-green-900">${results.totalCost}</span>
                      </div>
                      {costEstimate.estimatedCost > 0 && (
                        <div className="ml-2 px-2 py-1 bg-gray-100 rounded text-gray-700">
                          {((results.totalCost - costEstimate.estimatedCost) / costEstimate.estimatedCost * 100).toFixed(1)}% difference
                        </div>
                      )}
                    </div>
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
