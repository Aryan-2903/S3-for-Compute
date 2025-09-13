# S3 for Compute - Infinitely Scalable Serverless Platform

E6data X IIT BHU hackathon MVP demonstrating a serverless compute platform where developers can upload JavaScript functions and the system automatically handles execution, scaling, retries, and monitoring.

##  Features

### Core Functionality
- **Function Upload & Management**: Upload JavaScript functions with metadata
- **Automatic Execution**: Execute functions with input parameters
- **Intelligent Scaling**: Simulated auto-scaling based on queue length
- **Fault Tolerance**: Automatic retries with exponential backoff
- **Real-time Monitoring**: Live metrics and scaling events via WebSocket
- **Load Testing**: Built-in load testing to demonstrate scaling behavior

### Technical Features
- **Worker Threads**: Safe function execution in isolated worker threads
- **MongoDB Storage**: Persistent storage for functions, executions, and scaling events
- **WebSocket Updates**: Real-time monitoring dashboard updates
- **Responsive UI**: Modern React interface with TailwindCSS
- **Charts & Visualizations**: Interactive charts showing scaling and execution metrics

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

### 4. Load Testing
- Select a function and configure test parameters
- Run concurrent requests to trigger auto-scaling
- Observe scaling events in real-time

##  Sample Functions

The platform includes several pre-built sample functions:

1. **Fibonacci Calculator**: Calculate nth Fibonacci number
2. **String Reverser**: Reverse input text
3. **Array Sum**: Sum all numbers in an array
4. **Prime Checker**: Check if a number is prime

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
- `GET /api/metrics` - Get system metrics
- `GET /api/metrics/executions/history` - Get execution history
- `GET /api/metrics/scaling/history` - Get scaling events

### WebSocket
- `ws://localhost:5000` - Real-time updates

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
  functionId: ObjectId,
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
- **Retry Logic**: Up to 3 retries with exponential backoff

##  Testing

### Load Testing
1. Go to the Monitoring page
2. Select a function from the Load Tester
3. Configure concurrent requests (default: 20)
4. Set test duration (default: 30 seconds)
5. Click "Start Load Test"
6. Observe scaling events in real-time

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

##  Future Enhancements

- **Authentication**: User management and function isolation
- **Advanced Scaling**: More sophisticated scaling algorithms
- **Function Versioning**: Version control for functions
- **API Gateway**: Rate limiting and authentication
- **Container Support**: Docker-based function execution
- **Metrics Export**: Integration with monitoring tools


