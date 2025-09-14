# S3 for Compute - Infinitely Scalable Serverless Platform

E6data X IIT BHU hackathon MVP demonstrating a serverless compute platform where developers can upload JavaScript functions and the system automatically handles execution, scaling, retries, and monitoring.

##  Features

### Core Functionality
- **Function Upload & Management**: Upload JavaScript functions with metadata and version control
- **Automatic Execution**: Execute functions with input parameters in isolated worker threads
- **Intelligent Auto-Scaling**: Dynamic scaling based on execution queue length (scale up at 5+ pending, scale down at <2 pending)
- **Fault Tolerance**: Automatic retries with exponential backoff (2s, 4s, 8s delays)
- **Real-time Monitoring**: Live metrics and scaling events via WebSocket
- **Load Testing**: Built-in load testing to demonstrate scaling behavior
- **Cost Monitoring**: Comprehensive cost tracking and analysis with pricing tiers

### Technical Features
- **Worker Threads**: Safe function execution in isolated worker threads
- **MongoDB Storage**: Persistent storage for functions, executions, scaling events, and costs
- **WebSocket Updates**: Real-time monitoring dashboard updates
- **Responsive UI**: Modern React interface with TailwindCSS
- **Charts & Visualizations**: Interactive charts showing scaling, execution metrics, and cost trends
- **Multi-tier Pricing**: Basic, Standard, Premium, and Enterprise pricing tiers
- **Scaling Events Timeline**: Scrollable visual timeline of all scaling events with reasons

##  Tech Stack

### Backend
- **Node.js/Express.js**: REST API server
- **MongoDB**: Database for functions, executions, and scaling events
- **WebSockets**: Real-time communication
- **Worker Threads**: Safe function execution

### Frontend
- **React.js**: User interface
- **TailwindCSS**: Styling
- **Recharts**: Data visualization
- **Lucide React**: Icons

##  Installation

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
   cp env.example .env
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

##  Usage

### 1. Upload Functions
- Navigate to the Functions page
- Click "Upload Function" to create a new function
- Use the provided sample functions or write your own JavaScript code
- Functions receive input via the `input` parameter and should return a result

### 2. Execute Functions
- Click "Run" on any active function
- Functions execute with test input by default
- Monitor execution status in real-time

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

### 5. Load Testing
- Select a function and configure test parameters
- Run concurrent requests (up to 100 concurrent)
- Set test duration (10-300 seconds)
- **View cost estimates before testing**
- **See detailed cost analysis after testing**
- Observe scaling events in real-time
- Monitor cost impact of load testing

##  Sample Functions

The platform includes several pre-built sample functions:

1. **Fibonacci Calculator**: Calculate nth Fibonacci number
2. **String Reverser**: Reverse input text
3. **Array Sum**: Sum all numbers in an array
4. **Prime Checker**: Check if a number is prime

##  Demo Instructions

### Quick Start Demo
1. **Start the Platform**: Run `npm start` to start the server
2. **Access the UI**: Open http://localhost:3000 in your browser
3. **Upload a Function**: Go to Functions page and upload a sample function
4. **Execute Functions**: Click "Run" to execute functions and see real-time updates
5. **Monitor Scaling**: Visit Monitoring page to see scaling events and metrics
6. **Load Test**: Use the Load Tester to trigger auto-scaling behavior
7. **Cost Analysis**: Check Cost Monitoring page for detailed cost breakdown

### Scaling Demo
1. Go to Monitoring page
2. Use Load Tester with 20+ concurrent requests
3. **View cost estimate before starting the test**
4. Watch the Instance Scaling chart show scaling events
5. **Check the detailed cost analysis in test results**
6. Observe the Scaling Events Timeline for detailed scaling history
7. Monitor real-time updates in the dashboard

### Cost Analysis Demo
1. Execute several functions
2. Go to Cost Monitoring page
3. View cost trends and breakdown
4. Analyze pricing tier information
5. Track system-wide cost metrics

##  API Endpoints

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
- `GET /api/costs/function/:id` - Get function-specific costs
- `GET /api/costs/system` - Get system-wide cost analysis
- `GET /api/costs/executions` - Get execution cost details
- `GET /api/costs/trends` - Get cost trends over time
- `GET /api/costs/breakdown` - Get detailed cost breakdown

### WebSocket
- `ws://localhost:5000` - Real-time updates for scaling events, executions, and monitoring

##  Architecture

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
  instanceId: String
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

**Costs Collection**
```javascript
{
  _id: ObjectId,
  executionId: ObjectId,
  functionId: ObjectId,
  tier: String, // 'basic' | 'standard' | 'premium' | 'enterprise'
  baseCost: Number,
  coldStartCost: Number,
  retryCost: Number,
  dataTransferCost: Number,
  totalCost: Number,
  duration: Number,
  resourceUsage: {
    memoryMB: Number,
    cpuCores: Number
  },
  timestamp: Date
}
```

### Scaling Logic
- **Scale Up**: When >5 executions are queued (optimized for better responsiveness)
- **Scale Down**: When <2 executions for 30 seconds
- **Max Instances**: 10 (configurable)
- **Min Instances**: 1 (always maintains base capacity)
- **Retry Logic**: Up to 3 retries with exponential backoff (2s, 4s, 8s)
- **Auto-initialization**: Creates sample scaling events on first startup for demonstration

##  Testing

### Load Testing
1. Go to the Monitoring page
2. Select a function from the Load Tester
3. Configure concurrent requests (default: 20)
4. Set test duration (default: 30 seconds)
5. **View cost estimate before starting the test**
6. Click "Start Load Test"
7. **Check detailed cost analysis in test results**
8. Observe scaling events in real-time

### Manual Testing
1. Upload a function
2. Execute it multiple times
3. Monitor the execution logs
4. Check scaling behavior in the monitoring dashboard

##  Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure MongoDB Atlas or production MongoDB
3. Build the frontend: `npm run build`
4. Deploy to your preferred platform (Heroku, AWS, etc.)

### Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)

## 🔧 Troubleshooting

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




