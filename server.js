// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

// Import routes
const functionRoutes = require('./routes/functions');
const metricsRoutes = require('./routes/metrics');
const costRoutes = require('./routes/costs');

// Import services
const ExecutionEngine = require('./services/executionEngine');
const ScalingService = require('./services/scalingService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ------------------- MongoDB Atlas Connection -------------------
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});

// ------------------- Routes -------------------
app.use('/api/functions', functionRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/costs', costRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
}

// ------------------- HTTP & WebSocket Server -------------------
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

// Initialize services (singleton instances)
const executionEngine = new ExecutionEngine();
const scalingService = new ScalingService();

// Make execution engine available globally for routes
global.executionEngine = executionEngine;

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('📡 New WebSocket connection');

    ws.on('close', () => {
        console.log('📡 WebSocket connection closed');
    });
});

// Make WebSocket server available to services
executionEngine.setWebSocketServer(wss);
scalingService.setWebSocketServer(wss);

// Start scaling monitoring
scalingService.startMonitoring();

// ------------------- Graceful Shutdown -------------------
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});

// ------------------- Start Server -------------------
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 WebSocket server running on ws://localhost:${PORT}`);
});
