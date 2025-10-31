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

// Import routes
const callRoutes = require('./routes/calls');
const leadRoutes = require('./routes/leads');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');
const debugRoutes = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
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

app.listen(PORT, () => {
  logger.info(`🚀 Voice Sales AI server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🐛 Debug endpoint: http://localhost:${PORT}/api/debug/health`);
  
  DebugLogger.logSuccess('Server startup', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: process.uptime()
  });
});
