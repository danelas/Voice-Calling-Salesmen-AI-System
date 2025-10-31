const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const SystemDebugger = require('../utils/debugger');
const { DebugLogger } = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/debug/health
 * Comprehensive system health check
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await SystemDebugger.performHealthCheck(prisma);
    
    const statusCode = healthCheck.overall === 'healthy' ? 200 : 
                      healthCheck.overall === 'degraded' ? 206 : 500;
    
    res.status(statusCode).json({
      success: healthCheck.overall !== 'critical',
      health: healthCheck
    });
    
  } catch (error) {
    DebugLogger.logSystemError(error, 'health_check_endpoint');
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * GET /api/debug/database
 * Database connection diagnostics
 */
router.get('/database', async (req, res) => {
  try {
    const diagnostics = await SystemDebugger.diagnoseDatabaseIssues(prisma);
    
    res.json({
      success: diagnostics.database.connected,
      diagnostics: diagnostics
    });
    
  } catch (error) {
    DebugLogger.logDatabaseError(error, 'database_diagnostics');
    res.status(500).json({
      success: false,
      error: 'Database diagnostics failed',
      message: error.message
    });
  }
});

/**
 * GET /api/debug/api-keys
 * Test API key configurations
 */
router.get('/api-keys', async (req, res) => {
  try {
    const results = await SystemDebugger.testApiKeys();
    
    const allValid = results.openai.valid && 
                    results.elevenlabs.valid && 
                    results.textmagic.valid;
    
    res.json({
      success: allValid,
      apiKeys: results
    });
    
  } catch (error) {
    DebugLogger.logSystemError(error, 'api_key_test');
    res.status(500).json({
      success: false,
      error: 'API key test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/debug/environment
 * Validate environment configuration
 */
router.get('/environment', (req, res) => {
  try {
    const validation = SystemDebugger.validateEnvironment();
    
    res.json({
      success: validation.missing.length === 0,
      environment: validation
    });
    
  } catch (error) {
    DebugLogger.logSystemError(error, 'environment_validation');
    res.status(500).json({
      success: false,
      error: 'Environment validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/debug/resources
 * System resource monitoring
 */
router.get('/resources', (req, res) => {
  try {
    const resources = SystemDebugger.checkSystemResources();
    
    const healthy = resources.memory.usage < 85 && 
                   resources.cpu.loadAverage[0] < resources.cpu.cores * 0.8;
    
    res.json({
      success: healthy,
      resources: resources
    });
    
  } catch (error) {
    DebugLogger.logSystemError(error, 'resource_check');
    res.status(500).json({
      success: false,
      error: 'Resource check failed',
      message: error.message
    });
  }
});

/**
 * GET /api/debug/filesystem
 * File system access test
 */
router.get('/filesystem', (req, res) => {
  try {
    const fsTest = SystemDebugger.testFileSystemAccess();
    
    const allWritable = Object.values(fsTest.directories)
      .every(dir => dir.writable);
    
    res.json({
      success: allWritable,
      filesystem: fsTest
    });
    
  } catch (error) {
    DebugLogger.logFileSystemError(error, 'filesystem_test');
    res.status(500).json({
      success: false,
      error: 'Filesystem test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/debug/logs
 * Get recent error logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { hours = 24, limit = 50 } = req.query;
    
    const recentErrors = await SystemDebugger.getRecentErrors(parseInt(hours));
    const limitedErrors = recentErrors.slice(-parseInt(limit));
    
    res.json({
      success: true,
      logs: {
        count: limitedErrors.length,
        hours: parseInt(hours),
        errors: limitedErrors
      }
    });
    
  } catch (error) {
    DebugLogger.logFileSystemError(error, 'read_logs');
    res.status(500).json({
      success: false,
      error: 'Failed to read logs',
      message: error.message
    });
  }
});

/**
 * GET /api/debug/report
 * Generate comprehensive debug report
 */
router.get('/report', async (req, res) => {
  try {
    const report = await SystemDebugger.generateDebugReport(prisma);
    
    res.json({
      success: true,
      report: report
    });
    
  } catch (error) {
    DebugLogger.logSystemError(error, 'debug_report_generation');
    res.status(500).json({
      success: false,
      error: 'Failed to generate debug report',
      message: error.message
    });
  }
});

/**
 * POST /api/debug/test-call
 * Test call functionality with dummy data
 */
router.post('/test-call', async (req, res) => {
  try {
    const { leadId, testMessage = "Hello, this is a test call." } = req.body;
    
    // Validate lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found for testing'
      });
    }
    
    const testResults = {
      timestamp: new Date().toISOString(),
      leadId: leadId,
      tests: {}
    };
    
    // Test OpenAI response generation
    try {
      const OpenAIService = require('../services/openAIService');
      const openAI = new OpenAIService();
      
      const response = await openAI.generateSalesResponse(
        [{ role: 'user', content: testMessage }],
        lead,
        'Test call'
      );
      
      testResults.tests.openai = {
        success: true,
        response: response.response,
        usage: response.usage
      };
      
    } catch (error) {
      testResults.tests.openai = {
        success: false,
        error: error.message
      };
      DebugLogger.logOpenAIError(error, 'test_call', { testMessage });
    }
    
    // Test ElevenLabs audio generation
    try {
      const ElevenLabsService = require('../services/elevenLabsService');
      const elevenLabs = new ElevenLabsService();
      
      const audio = await elevenLabs.generateSalesAudio(
        testMessage,
        'professional',
        'test_call'
      );
      
      testResults.tests.elevenlabs = {
        success: true,
        audioFile: audio.filename,
        textLength: testMessage.length
      };
      
    } catch (error) {
      testResults.tests.elevenlabs = {
        success: false,
        error: error.message
      };
      DebugLogger.logElevenLabsError(error, 'test_call', testMessage.length);
    }
    
    // Test TextMagic SMS (simulation)
    try {
      const TextMagicService = require('../services/textMagicService');
      const textMagic = new TextMagicService();
      
      const isValidPhone = textMagic.validatePhoneNumber(lead.phone);
      
      testResults.tests.textmagic = {
        success: isValidPhone,
        phoneValid: isValidPhone,
        phone: lead.phone
      };
      
    } catch (error) {
      testResults.tests.textmagic = {
        success: false,
        error: error.message
      };
      DebugLogger.logTextMagicError(error, 'test_call', lead.phone);
    }
    
    const allTestsPassed = Object.values(testResults.tests)
      .every(test => test.success);
    
    res.json({
      success: allTestsPassed,
      testResults: testResults
    });
    
  } catch (error) {
    DebugLogger.logCallError('test_call', error, 'testing');
    res.status(500).json({
      success: false,
      error: 'Test call failed',
      message: error.message
    });
  }
});

/**
 * POST /api/debug/clear-logs
 * Clear old log files (admin only)
 */
router.post('/clear-logs', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { days = 7 } = req.body;
    
    const logsDir = path.join(__dirname, '../logs');
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    const logFiles = ['error.log', 'combined.log', 'api.log', 'calls.log'];
    const results = {};
    
    for (const logFile of logFiles) {
      const filePath = path.join(logsDir, logFile);
      
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.writeFileSync(filePath, ''); // Clear file content
            results[logFile] = 'cleared';
          } else {
            results[logFile] = 'kept (too recent)';
          }
        } else {
          results[logFile] = 'not found';
        }
      } catch (error) {
        results[logFile] = `error: ${error.message}`;
      }
    }
    
    DebugLogger.logSuccess('Log cleanup', { days, results });
    
    res.json({
      success: true,
      message: `Log cleanup completed for files older than ${days} days`,
      results: results
    });
    
  } catch (error) {
    DebugLogger.logFileSystemError(error, 'clear_logs');
    res.status(500).json({
      success: false,
      error: 'Log cleanup failed',
      message: error.message
    });
  }
});

/**
 * GET /api/debug/performance
 * Performance monitoring endpoint
 */
router.get('/performance', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database query performance
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - dbStart;
    
    // Test memory usage
    const memUsage = process.memoryUsage();
    
    // Test CPU usage (simplified)
    const cpuStart = process.cpuUsage();
    // Simulate some work
    for (let i = 0; i < 100000; i++) { Math.random(); }
    const cpuEnd = process.cpuUsage(cpuStart);
    
    const totalTime = Date.now() - startTime;
    
    const performance = {
      timestamp: new Date().toISOString(),
      database: {
        queryTime: dbTime,
        status: dbTime < 100 ? 'good' : dbTime < 500 ? 'warning' : 'poor'
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuEnd.user,
        system: cpuEnd.system
      },
      responseTime: totalTime,
      uptime: Math.round(process.uptime())
    };
    
    // Log performance issues
    if (dbTime > 500) {
      DebugLogger.logPerformanceIssue('database_query', dbTime, 500);
    }
    
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      DebugLogger.logResourceIssue('heap_memory', 
        Math.round(memUsage.heapUsed / 1024 / 1024), 500);
    }
    
    res.json({
      success: true,
      performance: performance
    });
    
  } catch (error) {
    DebugLogger.logSystemError(error, 'performance_check');
    res.status(500).json({
      success: false,
      error: 'Performance check failed',
      message: error.message
    });
  }
});

module.exports = router;
