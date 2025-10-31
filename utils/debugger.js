const { logger, DebugLogger } = require('./logger');

/**
 * Common debugging utilities and issue diagnostics
 */
class SystemDebugger {

  /**
   * Diagnose database connection issues
   */
  static async diagnoseDatabaseIssues(prisma) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        latency: null,
        error: null
      }
    };

    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const endTime = Date.now();
      
      diagnostics.database.connected = true;
      diagnostics.database.latency = endTime - startTime;
      
      DebugLogger.logSuccess('Database Connection Check', {
        latency: diagnostics.database.latency
      });
      
    } catch (error) {
      diagnostics.database.error = error.message;
      DebugLogger.logDatabaseError(error, 'connection_check');
      
      // Common database issues
      if (error.message.includes('ECONNREFUSED')) {
        logger.error('Database connection refused - check if PostgreSQL is running');
      } else if (error.message.includes('authentication failed')) {
        logger.error('Database authentication failed - check credentials');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        logger.error('Database does not exist - run migrations');
      }
    }

    return diagnostics;
  }

  /**
   * Test API key configurations
   */
  static async testApiKeys() {
    const results = {
      timestamp: new Date().toISOString(),
      openai: { valid: false, error: null },
      elevenlabs: { valid: false, error: null },
      textmagic: { valid: false, error: null }
    };

    // Test OpenAI
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not found in environment');
      }
      
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      await openai.models.list();
      results.openai.valid = true;
      DebugLogger.logSuccess('OpenAI API Key Test');
      
    } catch (error) {
      results.openai.error = error.message;
      DebugLogger.logApiKeyError('OpenAI', error, !!process.env.OPENAI_API_KEY);
    }

    // Test ElevenLabs
    try {
      if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error('ELEVENLABS_API_KEY not found in environment');
      }
      
      const axios = require('axios');
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        timeout: 10000
      });
      
      results.elevenlabs.valid = true;
      DebugLogger.logSuccess('ElevenLabs API Key Test', {
        voicesCount: response.data.voices?.length || 0
      });
      
    } catch (error) {
      results.elevenlabs.error = error.message;
      DebugLogger.logApiKeyError('ElevenLabs', error, !!process.env.ELEVENLABS_API_KEY);
    }

    // Test TextMagic
    try {
      if (!process.env.TEXTMAGIC_USERNAME || !process.env.TEXTMAGIC_API_KEY) {
        throw new Error('TextMagic credentials not found in environment');
      }
      
      results.textmagic.valid = true; // TextMagic doesn't have a simple test endpoint
      DebugLogger.logSuccess('TextMagic Configuration Check');
      
    } catch (error) {
      results.textmagic.error = error.message;
      DebugLogger.logApiKeyError('TextMagic', error, 
        !!(process.env.TEXTMAGIC_USERNAME && process.env.TEXTMAGIC_API_KEY));
    }

    return results;
  }

  /**
   * Check system resources and performance
   */
  static checkSystemResources() {
    const os = require('os');
    
    const resources = {
      timestamp: new Date().toISOString(),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024), // MB
        free: Math.round(os.freemem() / 1024 / 1024), // MB
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024), // MB
        usage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100) // %
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
        platform: os.platform(),
        arch: os.arch()
      },
      uptime: Math.round(os.uptime()),
      nodeVersion: process.version,
      processMemory: process.memoryUsage()
    };

    // Check for resource issues
    if (resources.memory.usage > 85) {
      DebugLogger.logResourceIssue('memory', resources.memory.used, resources.memory.total);
    }

    if (resources.cpu.loadAverage[0] > resources.cpu.cores * 0.8) {
      DebugLogger.logResourceIssue('cpu', resources.cpu.loadAverage[0], resources.cpu.cores, 'load');
    }

    return resources;
  }

  /**
   * Validate environment configuration
   */
  static validateEnvironment() {
    const requiredVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'ELEVENLABS_API_KEY',
      'TEXTMAGIC_USERNAME',
      'TEXTMAGIC_API_KEY'
    ];

    const optionalVars = [
      'ELEVENLABS_VOICE_ID',
      'JWT_SECRET',
      'PORT',
      'NODE_ENV'
    ];

    const validation = {
      timestamp: new Date().toISOString(),
      required: {},
      optional: {},
      missing: [],
      warnings: []
    };

    // Check required variables
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      validation.required[varName] = {
        present: !!value,
        length: value ? value.length : 0
      };

      if (!value) {
        validation.missing.push(varName);
        DebugLogger.logConfigError(varName, 'Required environment variable missing');
      }
    });

    // Check optional variables
    optionalVars.forEach(varName => {
      const value = process.env[varName];
      validation.optional[varName] = {
        present: !!value,
        length: value ? value.length : 0
      };

      if (!value) {
        validation.warnings.push(`Optional variable ${varName} not set`);
      }
    });

    // Validate specific formats
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
      validation.warnings.push('DATABASE_URL should start with postgresql://');
    }

    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      validation.warnings.push('OPENAI_API_KEY should start with sk-');
    }

    return validation;
  }

  /**
   * Test file system permissions
   */
  static testFileSystemAccess() {
    const fs = require('fs');
    const path = require('path');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      directories: {},
      permissions: {}
    };

    const testDirs = [
      { name: 'logs', path: path.join(__dirname, '../logs') },
      { name: 'audio', path: path.join(__dirname, '../audio') },
      { name: 'temp', path: path.join(__dirname, '../temp') }
    ];

    testDirs.forEach(dir => {
      try {
        // Check if directory exists
        const exists = fs.existsSync(dir.path);
        
        if (!exists) {
          // Try to create directory
          fs.mkdirSync(dir.path, { recursive: true });
        }

        // Test write permissions
        const testFile = path.join(dir.path, 'test_write.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        testResults.directories[dir.name] = {
          exists: true,
          writable: true,
          path: dir.path
        };

        DebugLogger.logSuccess(`File System Test: ${dir.name}`, {
          path: dir.path
        });

      } catch (error) {
        testResults.directories[dir.name] = {
          exists: fs.existsSync(dir.path),
          writable: false,
          error: error.message,
          path: dir.path
        };

        DebugLogger.logFileSystemError(error, `test_${dir.name}`, dir.path);
      }
    });

    return testResults;
  }

  /**
   * Comprehensive system health check
   */
  static async performHealthCheck(prisma) {
    logger.info('Starting comprehensive system health check...');
    
    const healthCheck = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      components: {}
    };

    try {
      // Database check
      healthCheck.components.database = await this.diagnoseDatabaseIssues(prisma);
      
      // API keys check
      healthCheck.components.apiKeys = await this.testApiKeys();
      
      // System resources
      healthCheck.components.resources = this.checkSystemResources();
      
      // Environment validation
      healthCheck.components.environment = this.validateEnvironment();
      
      // File system check
      healthCheck.components.filesystem = this.testFileSystemAccess();

      // Determine overall health
      const issues = [];
      
      if (!healthCheck.components.database.database.connected) {
        issues.push('Database connection failed');
      }
      
      if (!healthCheck.components.apiKeys.openai.valid) {
        issues.push('OpenAI API key invalid');
      }
      
      if (!healthCheck.components.apiKeys.elevenlabs.valid) {
        issues.push('ElevenLabs API key invalid');
      }
      
      if (healthCheck.components.environment.missing.length > 0) {
        issues.push(`Missing environment variables: ${healthCheck.components.environment.missing.join(', ')}`);
      }

      if (issues.length === 0) {
        healthCheck.overall = 'healthy';
        logger.info('System health check completed - All systems operational');
      } else {
        healthCheck.overall = 'degraded';
        healthCheck.issues = issues;
        logger.warn('System health check completed - Issues detected', { issues });
      }

    } catch (error) {
      healthCheck.overall = 'critical';
      healthCheck.error = error.message;
      DebugLogger.logSystemError(error, 'health_check');
    }

    return healthCheck;
  }

  /**
   * Generate debug report
   */
  static async generateDebugReport(prisma) {
    const report = {
      timestamp: new Date().toISOString(),
      version: require('../package.json').version,
      environment: process.env.NODE_ENV || 'development',
      healthCheck: await this.performHealthCheck(prisma),
      recentErrors: await this.getRecentErrors(),
      recommendations: []
    };

    // Generate recommendations based on findings
    if (!report.healthCheck.components.database.database.connected) {
      report.recommendations.push({
        priority: 'high',
        category: 'database',
        issue: 'Database connection failed',
        solution: 'Check DATABASE_URL and ensure PostgreSQL is running'
      });
    }

    if (!report.healthCheck.components.apiKeys.openai.valid) {
      report.recommendations.push({
        priority: 'high',
        category: 'api',
        issue: 'OpenAI API key invalid',
        solution: 'Verify OPENAI_API_KEY in environment variables'
      });
    }

    if (report.healthCheck.components.resources.memory.usage > 85) {
      report.recommendations.push({
        priority: 'medium',
        category: 'performance',
        issue: 'High memory usage',
        solution: 'Consider increasing server memory or optimizing application'
      });
    }

    logger.info('Debug report generated', {
      overall: report.healthCheck.overall,
      recommendations: report.recommendations.length
    });

    return report;
  }

  /**
   * Get recent error logs
   */
  static async getRecentErrors(hours = 24) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const errorLogPath = path.join(__dirname, '../logs/error.log');
      
      if (!fs.existsSync(errorLogPath)) {
        return [];
      }

      const logContent = fs.readFileSync(errorLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const recentErrors = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log && new Date(log.timestamp) > cutoffTime)
        .slice(-50); // Last 50 errors

      return recentErrors;
      
    } catch (error) {
      DebugLogger.logFileSystemError(error, 'read_error_logs');
      return [];
    }
  }
}

module.exports = SystemDebugger;
