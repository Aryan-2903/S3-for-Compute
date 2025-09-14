# S3 for Compute - Serverless Function Execution Platform

A comprehensive serverless compute platform where developers can upload JavaScript functions and the system automatically handles execution, scaling, cost calculation, and monitoring with real-time updates.

## Features

### Core Functionality
- **Function Upload & Management**: Upload JavaScript functions with metadata and configuration
- **Automatic Execution**: Execute functions with input parameters in isolated worker threads
- **Intelligent Auto-Scaling**: Dynamic scaling based on execution queue length and load
- **Fault Tolerance**: Automatic retries with exponential backoff (2s, 4s, 8s delays)
- **Real-time Monitoring**: Live metrics and scaling events via WebSocket
- **Load Testing**: Built-in load testing with cost estimation and analysis
- **Cost Monitoring**: Comprehensive cost tracking with tiered pricing and real-time calculation

### Advanced Features
- **Multi-tier Pricing**: Automatic tier determination based on function characteristics
- **Real-time Cost Calculation**: Per-execution cost breakdown with detailed analysis
- **Cost Trends Analysis**: Historical cost data with hourly, daily, and monthly views
- **Function-specific Cost Tracking**: Individual function cost monitoring and optimization
- **System-wide Cost Overview**: Complete platform cost analysis and reporting
- **Pre-execution Cost Estimation**: Cost prediction before function execution
- **Load Testing Cost Analysis**: Detailed cost breakdown for load testing scenarios

### Technical Features
- **Worker Threads**: Safe function execution in isolated worker threads
- **MongoDB Storage**: Persistent storage for functions, executions, scaling events, and costs
- **WebSocket Updates**: Real-time monitoring dashboard updates
- **Responsive UI**: Modern React interface with TailwindCSS
- **Interactive Charts**: Execution history, scaling events, and cost trend visualizations
- **Automatic Tier Detection**: Smart pricing tier assignment based on code complexity
- **Scaling Events Timeline**: Visual timeline of all scaling events with detailed reasons

## Tech Stack

### Backend
- **Node.js/Express.js**: REST API server
- **MongoDB**: Database for functions, executions, scaling events, and costs
- **WebSockets**: Real-time communication
- **Worker Threads**: Safe function execution
- **Mongoose**: MongoDB object modeling

### Frontend
- **React.js**: User interface
- **React Router**: Client-side routing
- **TailwindCSS**: Styling framework
- **Recharts**: Data visualization
- **Lucide React**: Icon library
- **Axios**: HTTP client

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd s3-for-compute
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/s3-compute
   NODE_ENV=development
   PORT=5000
   ```

5. **Start MongoDB**
   Make sure MongoDB is running on your system.

6. **Start the application**
   ```bash
   # Start backend server
   npm run dev

   # In another terminal, start frontend
   npm run client
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - WebSocket: ws://localhost:5000

## Usage

### 1. Upload Functions
- Navigate to the Functions page
- Click "Upload Function" to create a new function
- Use the provided sample functions or write your own JavaScript code
- Functions receive input via the `input` parameter and should return a result

### 2. Execute Functions
- Click "Run" on any active function
- Functions execute with test input by default
- Monitor execution status in real-time
- View cost calculation for each execution

### 3. Monitor Performance
- Visit the Monitoring page for real-time metrics
- View scaling events and execution history
- Use the Load Tester to trigger scaling behavior
- Monitor real-time scaling events in the timeline

### 4. Cost Analysis
- Visit the Cost Monitoring page for detailed cost breakdown
- View cost trends and pricing tier information
- Analyze function-specific and system-wide costs
- Track cost optimization opportunities
- Monitor real-time cost updates

### 5. Load Testing
- Select a function and configure test parameters
- Run concurrent requests (up to 100 concurrent)
- Set test duration (10-300 seconds)
- View cost estimates before testing
- See detailed cost analysis after testing
- Observe scaling events in real-time
- Monitor cost impact of load testing

## Pricing Tiers

The platform uses automatic tier determination based on function characteristics:

| Tier | Code Length | Timeout | Price/100ms | Memory | CPU | Description |
|------|-------------|---------|-------------|--------|-----|-------------|
| **Basic** | ≤100 chars | ≤60s | $0.0001 | 128MB | 0.1 cores | Lightweight functions |
| **Standard** | 101-5000 chars | ≤60s | $0.0003 | 512MB | 0.5 cores | Standard functions |
| **Premium** | 5001-10000 chars | ≤60s | $0.0008 | 1GB | 1.0 cores | High-performance functions |
| **Enterprise** | >10000 chars | any | $0.002 | 2GB | 2.0 cores | Enterprise-grade functions |

### Additional Cost Factors
- **Cold Start**: $0.00005 per cold start
- **Retry Attempts**: $0.00002 per retry
- **Data Transfer**: $0.000001 per KB
- **Scaling Events**: $0.0001 per scaling event

## Sample Functions

The platform includes several pre-built sample functions:

1. **Fibonacci Calculator**: Calculate nth Fibonacci number
2. **String Reverser**: Reverse input text
3. **Array Sum**: Sum all numbers in an array
4. **Prime Checker**: Check if a number is prime
5. **Factorial Calculator**: Calculate factorial of a number

## API Endpoints

### Functions
- `POST /api/functions` - Create function
- `GET /api/functions` - List all functions
- `GET /api/functions/:id` - Get function details
- `POST /api/functions/:id/execute` - Execute function
- `GET /api/functions/:id/logs` - Get execution logs
- `PUT /api/functions/:id` - Update function
- `DELETE /api/functions/:id` - Delete function

### Metrics
- `GET /api/metrics` - Get system metrics and overview
- `GET /api/metrics/executions/history` - Get execution history
- `GET /api/metrics/scaling/history` - Get scaling events timeline

### Costs
- `GET /api/costs/pricing` - Get pricing tiers information
- `POST /api/costs/estimate` - Estimate function execution cost
- `GET /api/costs/system` - Get system-wide cost analysis
- `GET /api/costs/trends` - Get cost trends over time
- `GET /api/costs/breakdown` - Get detailed cost breakdown

### WebSocket
- `ws://localhost:5000` - Real-time updates for scaling events, executions, and monitoring

## Architecture

### Database Schema

**Functions Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  code: String,
  createdAt: Date,
  status: String, // 'active' | 'inactive'
  config: { timeout: Number, retryCount: Number }
}
```

**Executions Collection**
```javascript
{
  _id: ObjectId,
  functionId: ObjectId,
  input: Object,
  output: Object,
  status: String, // 'pending' | 'running' | 'completed' | 'failed'
  startTime: Date,
  endTime: Date,
  duration: Number,
  error: String,
  retryCount: Number,
  instanceId: String,
  cost: {
    tier: String,
    baseCost: Number,
    coldStartCost: Number,
    retryCost: Number,
    dataTransferCost: Number,
    totalCost: Number,
    resourceUsage: {
      memoryMB: Number,
      cpuCores: Number
    }
  }
}
```

**Scaling Events Collection**
```javascript
{
  _id: ObjectId,
  functionId: ObjectId, // Optional - null for system-wide scaling
  action: String, // 'scale_up' | 'scale_down'
  instanceCount: Number,
  timestamp: Date,
  reason: String
}
```

### Scaling Logic
- **Scale Up**: When >10 executions are queued
- **Scale Down**: When <3 executions for 30 seconds
- **Max Instances**: 10 (configurable)
- **Min Instances**: 1 (always maintains base capacity)
- **Retry Logic**: Up to 3 retries with exponential backoff (2s, 4s, 8s)

## Testing

### Load Testing
1. Go to the Monitoring page
2. Select a function from the Load Tester
3. Configure concurrent requests (default: 20)
4. Set test duration (default: 30 seconds)
5. View cost estimate before starting the test
6. Click "Start Load Test"
7. Check detailed cost analysis in test results
8. Observe scaling events in real-time

### Manual Testing
1. Upload a function
2. Execute it multiple times
3. Monitor the execution logs
4. Check scaling behavior in the monitoring dashboard
5. Analyze costs in the Cost Monitoring page

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure MongoDB Atlas or production MongoDB
3. Build the frontend: `npm run build`
4. Deploy to your preferred platform (Heroku, AWS, etc.)

### Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)

## Troubleshooting

### Common Issues

**Port Already in Use Error**
```bash
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Kill the existing process or change the port
```bash
# Find and kill process using port 5000
netstat -ano | findstr :5000
taskkill /F /PID <PID_NUMBER>

# Or change port in .env file
PORT=5001
```


## Documentation

For detailed technical documentation, see [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) which includes:
- Complete API reference
- Database schema details
- Cost calculation formulas
- Architecture diagrams
- Security considerations
- Performance optimization guidelines