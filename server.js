const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import logging and error handling
const { logger, DebugLogger } = require('./utils/logger');
const { errorHandler, notFoundHandler, timeoutHandler } = require('./middleware/errorHandler');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Run database migrations on startup
async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Generate Prisma client first
    await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated');
    
    // Push schema changes
    await execAsync('npx prisma db push --accept-data-loss');
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    console.error('Full error:', error);
    // Don't exit the process, let the app try to run anyway
  }
}

// Add startup error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately, log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, log the error
});

// Import routes
const callRoutes = require('./routes/calls');
const leadRoutes = require('./routes/leads');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');
const debugRoutes = require('./routes/debug');
const voiceRoutes = require('./routes/voice');
const bulkRoutes = require('./routes/bulk');
const { router: realtimeVoiceRoutes, setupWebSocketServer } = require('./routes/realtimeVoice');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(timeoutHandler(30000)); // 30 second timeout
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/calls', callRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/realtime-voice', realtimeVoiceRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
    
    DebugLogger.logHealthCheck('api', 'healthy', {
      uptime: Math.round(process.uptime()),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.round(process.uptime()),
      database: 'connected'
    });
  } catch (error) {
    DebugLogger.logHealthCheck('api', 'unhealthy', { error: error.message });
    
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: 'Database connection failed'
    });
  }
});

// Serve static files from React build
const buildPath = path.join(__dirname, 'client/build');
const fs = require('fs');

console.log('🔍 Checking for React build at:', buildPath);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

// Check if build directory exists
if (fs.existsSync(buildPath)) {
  console.log('✅ React build directory found, serving static files from:', buildPath);
  app.use(express.static(buildPath));
  
  app.get('*', (req, res, next) => {
    // Skip API routes - let them be handled by API routers or 404 handler
    if (req.path.startsWith('/api/')) {
      return next();
    }
    console.log('📄 Serving React app for route:', req.path);
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('❌ React build directory not found at:', buildPath);
  // Temporary fallback for missing build
  app.get('/', (req, res) => {
    console.log('🏠 Serving fallback home page');
    res.json({
      message: 'Voice Sales AI System',
      status: 'Running',
      dashboard: 'React build not found - using API mode',
      environment: process.env.NODE_ENV || 'not set',
      buildPath: buildPath,
      api: {
        health: '/api/health',
        leads: '/api/leads',
        calls: '/api/calls',
        analytics: '/api/analytics',
        debug: '/api/debug/health',
        testCall: '/api/calls/test'
      },
      instructions: {
        testCall: 'POST to /api/calls/test with {"phone": "YOUR_NUMBER"}',
        addLead: 'POST to /api/leads with lead data',
        viewCalls: 'GET /api/calls to see all calls'
      },
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/conversations', (req, res) => {
    res.redirect('/api/calls');
  });
  
  app.get('/dashboard', (req, res) => {
    res.redirect('/api/dashboard');
  });
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', notFoundHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Test environment variables before starting
console.log('🔍 Environment Check:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
console.log('- TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing');
console.log('- ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'Set' : 'Missing');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');
console.log('- BASE_URL:', process.env.BASE_URL || 'Not set');

const server = app.listen(PORT, () => {
  logger.info(`🚀 Voice Sales AI server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🐛 Debug endpoint: http://localhost:${PORT}/api/debug/health`);
  
  // Set up WebSocket server for realtime voice
  try {
    setupWebSocketServer(server);
    console.log('🎙️ WebSocket server setup completed successfully');
    logger.info(`🎙️ WebSocket server ready for realtime voice calls`);
  } catch (error) {
    console.error('❌ WebSocket server setup failed:', error);
  }
  
  // Run database migrations after server starts (non-blocking)
  runMigrations().catch(err => {
    console.error('Migration failed but server continues:', err.message);
  });
  
  DebugLogger.logSuccess('Server startup', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: process.uptime()
  });
});
