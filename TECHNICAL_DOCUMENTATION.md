# S3-for-Compute: Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Cost Model & Pricing](#cost-model--pricing)
5. [Execution Engine](#execution-engine)
6. [API Reference](#api-reference)
7. [Frontend Architecture](#frontend-architecture)
8. [WebSocket Communication](#websocket-communication)
9. [Scaling & Performance](#scaling--performance)
10. [Security Considerations](#security-considerations)
11. [Deployment](#deployment)

---

## System Overview

**S3-for-Compute** is a serverless function execution platform that provides:
- **Function Management**: Upload, store, and manage JavaScript functions
- **Execution Engine**: Isolated execution using Node.js worker threads
- **Cost Monitoring**: Real-time cost tracking with tiered pricing
- **Auto-scaling**: Dynamic scaling based on load
- **Real-time Monitoring**: Live metrics and execution tracking

### Key Features
- **Multi-tier Pricing**: Basic, Standard, Premium, Enterprise tiers
- **Automatic Tier Detection**: Based on code complexity and timeout
- **Real-time Cost Calculation**: Per-execution cost breakdown
- **Load Testing**: Simulate concurrent executions
- **WebSocket Updates**: Live execution status and metrics
- **MongoDB Storage**: Persistent function and execution data

---

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • API Routes    │    │ • Functions     │
│ • Functions     │    │ • Execution     │    │ • Executions    │
│ • Monitoring    │    │   Engine        │    │ • ScalingEvents │
│ • Cost Tracking │    │ • Cost Service  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────►│   WebSocket     │
                        │   Server        │
                        │   (Real-time)   │
                        └─────────────────┘
```

### Component Interaction Flow
1. **Function Upload**: User uploads function → Stored in MongoDB
2. **Function Execution**: API call → Execution Engine → Worker Thread
3. **Cost Calculation**: Execution completion → Cost Service → Database
4. **Real-time Updates**: WebSocket broadcasts → Frontend updates
5. **Auto-scaling**: Load monitoring → Scaling Service → Instance adjustment

---

## Database Schema

### 1. Function Model (`models/Function.js`)
```javascript
{
  _id: ObjectId,                    // Unique identifier
  name: String,                     // Function name (required)
  description: String,              // Function description (required)
  code: String,                     // JavaScript code (required)
  createdAt: Date,                  // Creation timestamp
  status: String,                   // 'active' | 'inactive'
  config: {
    timeout: Number,                // Execution timeout (default: 30000ms)
    retryCount: Number              // Max retry attempts (default: 3)
  }
}
```

**Indexes:**
- `{ name: 1 }` - Unique function names
- `{ status: 1, createdAt: -1 }` - Active functions by creation date

### 2. Execution Model (`models/Execution.js`)
```javascript
{
  _id: ObjectId,                    // Unique identifier
  functionId: ObjectId,             // Reference to Function
  input: Mixed,                     // Input data (any type)
  output: Mixed,                    // Output data (any type)
  status: String,                   // 'pending' | 'running' | 'completed' | 'failed'
  startTime: Date,                  // Execution start time
  endTime: Date,                    // Execution end time
  duration: Number,                 // Execution duration (ms)
  error: String,                    // Error message (if failed)
  retryCount: Number,               // Number of retry attempts
  instanceId: String,               // Worker instance identifier
  cost: {
    tier: String,                   // 'basic' | 'standard' | 'premium' | 'enterprise'
    baseCost: Number,               // Base execution cost
    coldStartCost: Number,          // Cold start cost
    retryCost: Number,              // Retry attempts cost
    dataTransferCost: Number,       // Data transfer cost
    totalCost: Number,              // Total cost
    resourceUsage: {
      memoryMB: Number,             // Allocated memory
      cpuCores: Number              // Allocated CPU cores
    }
  }
}
```

**Indexes:**
- `{ functionId: 1, startTime: -1 }` - Executions by function and time
- `{ status: 1, startTime: -1 }` - Executions by status and time
- `{ startTime: 1 }` - Time-based queries

### 3. ScalingEvent Model (`models/ScalingEvent.js`)
```javascript
{
  _id: ObjectId,                    // Unique identifier
  functionId: ObjectId,             // Function ID (optional for system-wide scaling)
  action: String,                   // 'scale_up' | 'scale_down'
  instanceCount: Number,            // New instance count
  timestamp: Date,                  // Scaling event time
  reason: String                    // Scaling reason
}
```

**Indexes:**
- `{ timestamp: -1 }` - Recent scaling events
- `{ action: 1, timestamp: -1 }` - Scaling events by action

---

## Cost Model & Pricing

### Pricing Tiers

| Tier | Code Length | Timeout | Price/100ms | Memory | CPU | Description |
|------|-------------|---------|-------------|--------|-----|-------------|
| **Basic** | ≤100 chars | ≤60s | $0.0001 | 128MB | 0.1 cores | Lightweight functions |
| **Standard** | 101-5000 chars | ≤60s | $0.0003 | 512MB | 0.5 cores | Standard functions |
| **Premium** | 5001-10000 chars | ≤60s | $0.0008 | 1GB | 1.0 cores | High-performance functions |
| **Enterprise** | >10000 chars | any | $0.002 | 2GB | 2.0 cores | Enterprise-grade functions |

### Additional Cost Factors
```javascript
{
  coldStart: 0.00005,        // $0.00005 per cold start
  retry: 0.00002,            // $0.00002 per retry attempt
  scaling: 0.0001,           // $0.0001 per scaling event
  dataTransfer: 0.000001,    // $0.000001 per KB of data transfer
  storage: 0.0001            // $0.0001 per MB per hour of storage
}
```

### Cost Calculation Formula
```javascript
totalCost = baseCost + coldStartCost + retryCost + dataTransferCost

where:
- baseCost = Math.ceil(duration / 100) * pricePer100ms
- coldStartCost = (retryCount === 0) ? 0.00005 : 0
- retryCost = retryCount * 0.00002
- dataTransferCost = (inputSize + outputSize) / 1024 * 0.000001
```

### Tier Determination Logic
```javascript
function determineTier(func) {
  const codeLength = func.code.length;
  const timeout = func.config.timeout || 30000;
  
  if (codeLength > 10000 || timeout > 120000) return 'enterprise';
  else if (codeLength > 5000 || timeout > 60000) return 'premium';
  else if (codeLength > 100 || timeout > 60000) return 'standard';
  else return 'basic';
}
```

---

## Execution Engine

### Core Components

#### 1. ExecutionEngine Class
```javascript
class ExecutionEngine {
  constructor() {
    this.activeExecutions = new Map();      // Currently running executions
    this.executionQueue = [];               // Pending executions
    this.maxConcurrentExecutions = 10;      // Max parallel executions
    this.instanceCount = 1;                 // Current instance count
    this.scalingThreshold = 10;             // Scale up threshold
    this.scaleDownThreshold = 3;            // Scale down threshold
    this.costService = new CostService();   // Cost calculation service
  }
}
```

#### 2. Execution Flow
1. **Function Submission**: `executeFunction(func, input)`
2. **Queue Management**: Add to `executionQueue`
3. **Scaling Check**: Evaluate if scaling is needed
4. **Worker Thread**: Execute in isolated environment
5. **Cost Calculation**: Calculate and store costs
6. **WebSocket Broadcast**: Notify frontend of completion

#### 3. Worker Thread Execution
```javascript
// Safe execution environment
const workerCode = `
  const { parentPort } = require('worker_threads');
  
  try {
    const userCode = ${JSON.stringify(code)};
    const input = ${JSON.stringify(input)};
    
    // Execute user code safely
    const result = executeUserCode(userCode, input);
    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
`;
```

### Error Handling & Retry Logic
- **Max Retries**: 3 attempts per execution
- **Exponential Backoff**: 2s, 4s, 8s delays
- **Error Types**: Timeout, syntax errors, runtime errors
- **Status Tracking**: pending → running → completed/failed

### Auto-scaling Logic
```javascript
// Scale up conditions
if (totalPending > scalingThreshold && instanceCount < 10) {
  await scaleUp(totalPending);
}

// Scale down conditions
if (totalPending < scaleDownThreshold && instanceCount > 1) {
  await scaleDown(totalPending);
}
```

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

### Functions API (`/api/functions`)

#### GET `/api/functions`
Get all functions
```javascript
Response: {
  success: true,
  data: [
    {
      _id: "function_id",
      name: "Function Name",
      description: "Function description",
      code: "function code...",
      status: "active",
      config: { timeout: 30000, retryCount: 3 }
    }
  ]
}
```

#### POST `/api/functions`
Create new function
```javascript
Request: {
  name: "Function Name",
  description: "Function description",
  code: "function add(a, b) { return a + b; }"
}

Response: {
  success: true,
  data: { /* function object */ }
}
```

#### POST `/api/functions/:id/execute`
Execute function
```javascript
Request: {
  input: { /* input data */ }
}

Response: {
  success: true,
  data: {
    executionId: "execution_id",
    status: "pending",
    message: "Function execution started"
  }
}
```

### Metrics API (`/api/metrics`)

#### GET `/api/metrics`
Get system overview
```javascript
Response: {
  success: true,
  data: {
    totalExecutions: 150,
    recentExecutions: 25,
    completedExecutions: 20,
    failedExecutions: 3,
    pendingExecutions: 2,
    successRate: 86.96,
    activeFunctions: 5,
    currentInstances: 2,
    averageExecutionTime: 1250
  }
}
```

#### GET `/api/metrics/scaling-history`
Get scaling events
```javascript
Response: {
  success: true,
  data: [
    {
      _id: "event_id",
      action: "scale_up",
      instanceCount: 3,
      timestamp: "2024-01-15T10:30:00Z",
      reason: "Queue length: 15"
    }
  ]
}
```

### Costs API (`/api/costs`)

#### GET `/api/costs/system`
Get system costs
```javascript
Response: {
  success: true,
  data: {
    period: { startDate: "2024-01-15", endDate: "2024-01-15" },
    totalSystemCost: 0.0456,
    totalExecutions: 25,
    averageCostPerExecution: 0.0018,
    functionCosts: [
      {
        functionId: "func_id",
        functionName: "Function Name",
        totalCost: 0.0234,
        executionCount: 15,
        tier: "standard"
      }
    ]
  }
}
```

#### GET `/api/costs/trends`
Get cost trends
```javascript
Response: {
  success: true,
  data: {
    hourly: [
      { hour: "00:00", cost: 0.0012, executions: 5 },
      { hour: "01:00", cost: 0.0023, executions: 8 }
    ]
  }
}
```

---

## Frontend Architecture

### Technology Stack
- **React 18**: Component-based UI
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **WebSocket**: Real-time communication
- **Tailwind CSS**: Styling framework
- **Lucide React**: Icon library

### Component Structure
```
src/
├── App.js                 # Main app component with routing
├── index.js              # React entry point
├── index.css             # Global styles
├── components/           # Reusable components
│   ├── Navbar.js         # Navigation bar
│   ├── FunctionList.js   # Function listing
│   ├── FunctionUpload.js # Function upload form
│   ├── LoadTester.js     # Load testing component
│   ├── MetricsCard.js    # Metrics display card
│   ├── CostChart.js      # Cost visualization
│   ├── ExecutionChart.js # Execution history chart
│   └── ...
├── pages/                # Page components
│   ├── Dashboard.js      # Main dashboard
│   ├── Functions.js      # Function management
│   ├── Monitoring.js     # System monitoring
│   └── CostMonitoring.js # Cost tracking
└── services/             # API and WebSocket services
    ├── api.js           # API client
    └── websocket.js     # WebSocket client
```

### State Management
- **Local State**: `useState` for component state
- **Effect Hooks**: `useEffect` for side effects
- **Custom Hooks**: Reusable stateful logic
- **Context**: Global state sharing (if needed)

### Real-time Updates
```javascript
// WebSocket connection
const WebSocketService = {
  connect() {
    this.ws = new WebSocket('ws://localhost:5000');
    this.ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      this.handleMessage(type, data);
    };
  },
  
  handleMessage(type, data) {
    switch(type) {
      case 'execution_completed':
        updateExecutionStatus(data);
        break;
      case 'scaling_event':
        updateScalingInfo(data);
        break;
    }
  }
};
```

---

## WebSocket Communication

### Connection Management
```javascript
// Server-side WebSocket setup
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});
```

### Message Types

#### 1. Execution Events
```javascript
// execution_started
{
  type: 'execution_started',
  data: {
    executionId: 'exec_id',
    functionId: 'func_id',
    status: 'running'
  },
  timestamp: '2024-01-15T10:30:00Z'
}

// execution_completed
{
  type: 'execution_completed',
  data: {
    executionId: 'exec_id',
    functionId: 'func_id',
    status: 'completed',
    duration: 1250,
    output: { result: 'success' },
    cost: { totalCost: 0.0012, tier: 'standard' }
  },
  timestamp: '2024-01-15T10:30:01Z'
}
```

#### 2. Scaling Events
```javascript
// scaling_event
{
  type: 'scaling_event',
  data: {
    action: 'scale_up',
    instanceCount: 3,
    reason: 'Queue length: 15',
    timestamp: '2024-01-15T10:30:00Z'
  },
  timestamp: '2024-01-15T10:30:00Z'
}
```

### Broadcasting Logic
```javascript
broadcastUpdate(type, data) {
  if (this.wss) {
    const message = JSON.stringify({ type, data, timestamp: new Date() });
    const clientCount = this.wss.clients.size;
    let sentCount = 0;
    
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
        sentCount++;
      }
    });
    
    console.log(`Broadcasting ${type} to ${sentCount}/${clientCount} clients`);
  }
}
```

---

## Scaling & Performance

### Auto-scaling Configuration
```javascript
const scalingConfig = {
  maxConcurrentExecutions: 10,    // Max parallel executions
  scalingThreshold: 10,           // Scale up when queue > 10
  scaleDownThreshold: 3,          // Scale down when queue < 3
  scaleDownTime: 30000,           // Check scale down every 30s
  maxInstances: 10                // Maximum instances
};
```

### Performance Metrics
- **Throughput**: Executions per second
- **Latency**: Average execution time
- **Queue Length**: Pending executions
- **Instance Count**: Active worker instances
- **Success Rate**: Completed vs failed executions

### Optimization Strategies
1. **Worker Thread Pool**: Reuse worker threads
2. **Connection Pooling**: MongoDB connection optimization
3. **Caching**: Function code caching
4. **Batch Processing**: Group similar operations
5. **Memory Management**: Garbage collection optimization

---

## Security Considerations

### Code Execution Security
```javascript
// Worker thread isolation
const worker = new Worker(workerCode, { 
  eval: true,
  timeout: 30000  // 30 second timeout
});

// Input validation
function validateInput(input) {
  if (typeof input !== 'object') {
    throw new Error('Invalid input type');
  }
  // Additional validation...
}
```

### Data Protection
- **Input Sanitization**: Validate all user inputs
- **Code Validation**: Check for malicious patterns
- **Timeout Limits**: Prevent infinite loops
- **Memory Limits**: Prevent memory exhaustion
- **Error Handling**: Secure error messages

### Network Security
- **CORS**: Configured for frontend access
- **Rate Limiting**: Prevent API abuse
- **Input Size Limits**: Prevent large payload attacks
- **WebSocket Security**: Connection validation

---

## Deployment

### Environment Variables
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/s3-compute

# Server
PORT=5000
NODE_ENV=production

# Optional
MAX_CONCURRENT_EXECUTIONS=10
SCALING_THRESHOLD=10
```

### Production Build
```bash
# Install dependencies
npm install

# Build frontend
cd client
npm run build
cd ..

# Start server
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN cd client && npm ci && npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

### Monitoring & Logging
- **Console Logging**: Development debugging
- **Error Tracking**: Unhandled exceptions
- **Performance Monitoring**: Execution metrics
- **Health Checks**: System status endpoints

---

## Database Queries & Aggregations

### Common Queries

#### 1. Get Recent Executions
```javascript
const recentExecutions = await Execution.find({
  startTime: { $gte: oneHourAgo }
}).sort({ startTime: -1 }).limit(100);
```

#### 2. Calculate System Costs
```javascript
const systemCosts = await Execution.aggregate([
  {
    $match: {
      startTime: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: null,
      totalCost: { $sum: '$cost.totalCost' },
      totalExecutions: { $sum: 1 },
      averageCost: { $avg: '$cost.totalCost' }
    }
  }
]);
```

#### 3. Get Cost Trends
```javascript
const costTrends = await Execution.aggregate([
  {
    $match: {
      startTime: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: '$startTime' },
        month: { $month: '$startTime' },
        day: { $dayOfMonth: '$startTime' },
        hour: { $hour: '$startTime' }
      },
      totalCost: { $sum: '$cost.totalCost' },
      executionCount: { $sum: 1 }
    }
  },
  {
    $sort: { '_id': 1 }
  }
]);
```

---

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failed
```javascript
// Check WebSocket server status
if (!this.wss) {
  console.error('WebSocket server not available');
  return;
}
```

#### 2. Execution Timeout
```javascript
// Increase timeout for long-running functions
const timeout = setTimeout(() => {
  worker.terminate();
  reject(new Error('Function execution timeout'));
}, 60000); // 60 seconds
```

#### 3. Memory Issues
```javascript
// Monitor memory usage
const memUsage = process.memoryUsage();
console.log('Memory usage:', memUsage);
```

### Debug Mode
```javascript
// Enable debug logging
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Debug: Execution started', executionId);
}
```

---

## Future Enhancements

### Planned Features
1. **Function Versioning**: Multiple versions per function
2. **Scheduled Executions**: Cron-like scheduling
3. **Function Dependencies**: Import external modules
4. **Advanced Monitoring**: Detailed performance metrics
5. **Cost Optimization**: Automatic tier recommendations
6. **Multi-language Support**: Python, Go, etc.
7. **API Gateway**: Rate limiting and authentication
8. **Function Templates**: Pre-built function templates

### Performance Improvements
1. **Connection Pooling**: Database connection optimization
2. **Caching Layer**: Redis for frequently accessed data
3. **Load Balancing**: Multiple server instances
4. **CDN Integration**: Static asset optimization
5. **Database Sharding**: Horizontal scaling

---

This documentation provides a comprehensive overview of the S3-for-Compute system architecture, implementation details, and operational procedures. For specific implementation questions or advanced configurations, refer to the source code or contact the development team.
