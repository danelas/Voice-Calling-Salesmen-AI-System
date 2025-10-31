#!/usr/bin/env node

/**
 * Voice Sales AI - Troubleshooting Script
 * 
 * This script helps diagnose and fix common issues
 * Run with: node scripts/troubleshoot.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

class Troubleshooter {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  // Check Node.js version
  checkNodeVersion() {
    logHeader('Checking Node.js Version');
    
    try {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      
      logInfo(`Current Node.js version: ${version}`);
      
      if (majorVersion >= 18) {
        logSuccess('Node.js version is compatible');
      } else {
        logError(`Node.js version ${version} is not supported. Please upgrade to Node.js 18+`);
        this.issues.push('Node.js version too old');
        this.fixes.push('Upgrade Node.js to version 18 or higher');
      }
    } catch (error) {
      logError(`Failed to check Node.js version: ${error.message}`);
    }
  }

  // Check if required files exist
  checkRequiredFiles() {
    logHeader('Checking Required Files');
    
    const requiredFiles = [
      'package.json',
      'server.js',
      'prisma/schema.prisma',
      '.env.example'
    ];

    const optionalFiles = [
      '.env',
      'node_modules',
      'logs'
    ];

    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        logSuccess(`${file} exists`);
      } else {
        logError(`${file} is missing`);
        this.issues.push(`Missing required file: ${file}`);
      }
    });

    optionalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        logSuccess(`${file} exists`);
      } else {
        logWarning(`${file} is missing (will be created if needed)`);
      }
    });
  }

  // Check environment variables
  checkEnvironmentVariables() {
    logHeader('Checking Environment Variables');
    
    // Load .env file if it exists
    if (fs.existsSync('.env')) {
      require('dotenv').config();
      logSuccess('.env file loaded');
    } else {
      logError('.env file not found');
      this.issues.push('Missing .env file');
      this.fixes.push('Copy .env.example to .env and fill in your API keys');
      return;
    }

    const requiredVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'ELEVENLABS_API_KEY',
      'TEXTMAGIC_USERNAME',
      'TEXTMAGIC_API_KEY'
    ];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        logSuccess(`${varName} is set (${value.length} characters)`);
      } else {
        logError(`${varName} is not set`);
        this.issues.push(`Missing environment variable: ${varName}`);
      }
    });

    // Validate specific formats
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
      logWarning('DATABASE_URL should start with postgresql://');
    }

    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      logWarning('OPENAI_API_KEY should start with sk-');
    }
  }

  // Check dependencies
  checkDependencies() {
    logHeader('Checking Dependencies');
    
    try {
      if (!fs.existsSync('node_modules')) {
        logError('node_modules directory not found');
        this.issues.push('Dependencies not installed');
        this.fixes.push('Run: npm install');
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      let missingDeps = 0;
      
      Object.keys(dependencies).forEach(dep => {
        try {
          require.resolve(dep);
          logSuccess(`${dep} is installed`);
        } catch (error) {
          logError(`${dep} is missing`);
          missingDeps++;
        }
      });

      if (missingDeps === 0) {
        logSuccess('All dependencies are installed');
      } else {
        this.issues.push(`${missingDeps} dependencies missing`);
        this.fixes.push('Run: npm install');
      }

    } catch (error) {
      logError(`Failed to check dependencies: ${error.message}`);
    }
  }

  // Check database connection
  async checkDatabase() {
    logHeader('Checking Database Connection');
    
    if (!process.env.DATABASE_URL) {
      logError('DATABASE_URL not set');
      return;
    }

    try {
      // Try to connect using Prisma
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.$connect();
      logSuccess('Database connection successful');
      
      // Check if tables exist
      try {
        await prisma.lead.count();
        logSuccess('Database tables are accessible');
      } catch (error) {
        logError('Database tables not found or not accessible');
        this.issues.push('Database schema not initialized');
        this.fixes.push('Run: npx prisma migrate dev');
      }
      
      await prisma.$disconnect();
      
    } catch (error) {
      logError(`Database connection failed: ${error.message}`);
      this.issues.push('Database connection failed');
      
      if (error.message.includes('ECONNREFUSED')) {
        this.fixes.push('Start PostgreSQL service');
      } else if (error.message.includes('authentication failed')) {
        this.fixes.push('Check database credentials in DATABASE_URL');
      } else if (error.message.includes('does not exist')) {
        this.fixes.push('Create database or run migrations');
      }
    }
  }

  // Check API connectivity
  async checkApiConnectivity() {
    logHeader('Checking API Connectivity');
    
    // Test OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        await openai.models.list();
        logSuccess('OpenAI API connection successful');
      } catch (error) {
        logError(`OpenAI API connection failed: ${error.message}`);
        this.issues.push('OpenAI API connection failed');
        
        if (error.message.includes('Incorrect API key')) {
          this.fixes.push('Check OPENAI_API_KEY in .env file');
        } else if (error.message.includes('quota')) {
          this.fixes.push('Add payment method to OpenAI account');
        }
      }
    }

    // Test ElevenLabs
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const axios = require('axios');
        const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
          headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
          timeout: 10000
        });
        
        logSuccess(`ElevenLabs API connection successful (${response.data.voices?.length || 0} voices available)`);
      } catch (error) {
        logError(`ElevenLabs API connection failed: ${error.message}`);
        this.issues.push('ElevenLabs API connection failed');
        this.fixes.push('Check ELEVENLABS_API_KEY in .env file');
      }
    }
  }

  // Check file permissions
  checkFilePermissions() {
    logHeader('Checking File Permissions');
    
    const testDirs = ['logs', 'audio', 'temp'];
    
    testDirs.forEach(dirName => {
      const dirPath = path.join(process.cwd(), dirName);
      
      try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          logSuccess(`Created ${dirName} directory`);
        }

        // Test write permissions
        const testFile = path.join(dirPath, 'test.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        logSuccess(`${dirName} directory is writable`);
      } catch (error) {
        logError(`${dirName} directory permission issue: ${error.message}`);
        this.issues.push(`File permission issue in ${dirName}`);
        this.fixes.push(`Fix permissions for ${dirName} directory`);
      }
    });
  }

  // Check port availability
  checkPortAvailability() {
    logHeader('Checking Port Availability');
    
    const port = process.env.PORT || 3001;
    
    try {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        logSuccess(`Port ${port} is available`);
        server.close();
      });
      
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logError(`Port ${port} is already in use`);
          this.issues.push(`Port ${port} is occupied`);
          this.fixes.push(`Change PORT in .env or stop the process using port ${port}`);
        } else {
          logError(`Port check failed: ${error.message}`);
        }
      });
      
    } catch (error) {
      logError(`Failed to check port availability: ${error.message}`);
    }
  }

  // Auto-fix common issues
  async autoFix() {
    logHeader('Attempting Auto-fixes');
    
    // Create missing directories
    const dirs = ['logs', 'audio', 'temp'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          logSuccess(`Created ${dir} directory`);
        } catch (error) {
          logError(`Failed to create ${dir}: ${error.message}`);
        }
      }
    });

    // Copy .env.example if .env doesn't exist
    if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
      try {
        fs.copyFileSync('.env.example', '.env');
        logSuccess('Created .env file from .env.example');
        logWarning('Please edit .env file and add your API keys');
      } catch (error) {
        logError(`Failed to create .env: ${error.message}`);
      }
    }

    // Install dependencies if missing
    if (!fs.existsSync('node_modules')) {
      try {
        logInfo('Installing dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        logSuccess('Dependencies installed successfully');
      } catch (error) {
        logError(`Failed to install dependencies: ${error.message}`);
      }
    }

    // Generate Prisma client if needed
    try {
      logInfo('Generating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      logSuccess('Prisma client generated');
    } catch (error) {
      logWarning(`Prisma generate failed: ${error.message}`);
    }
  }

  // Generate summary report
  generateSummary() {
    logHeader('Troubleshooting Summary');
    
    if (this.issues.length === 0) {
      logSuccess('No issues detected! Your system appears to be ready.');
    } else {
      logError(`Found ${this.issues.length} issue(s):`);
      this.issues.forEach((issue, index) => {
        log(`  ${index + 1}. ${issue}`, 'red');
      });
      
      if (this.fixes.length > 0) {
        console.log('\n' + colors.yellow + 'Recommended fixes:' + colors.reset);
        this.fixes.forEach((fix, index) => {
          log(`  ${index + 1}. ${fix}`, 'yellow');
        });
      }
    }

    console.log('\n' + colors.cyan + 'Next steps:' + colors.reset);
    log('1. Fix any issues listed above', 'blue');
    log('2. Run: npm start', 'blue');
    log('3. Test the application at http://localhost:3001/api/health', 'blue');
    log('4. Check logs in the logs/ directory for detailed information', 'blue');
  }

  // Run all checks
  async runAll() {
    log('Voice Sales AI - Troubleshooting Tool', 'magenta');
    log('This tool will help diagnose common setup issues\n', 'white');

    this.checkNodeVersion();
    this.checkRequiredFiles();
    this.checkEnvironmentVariables();
    this.checkDependencies();
    await this.checkDatabase();
    await this.checkApiConnectivity();
    this.checkFilePermissions();
    this.checkPortAvailability();
    
    // Ask user if they want auto-fixes
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\nWould you like to attempt automatic fixes? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await this.autoFix();
      }
      
      this.generateSummary();
      rl.close();
    });
  }
}

// Run troubleshooter if called directly
if (require.main === module) {
  const troubleshooter = new Troubleshooter();
  troubleshooter.runAll().catch(error => {
    console.error('Troubleshooter failed:', error);
    process.exit(1);
  });
}

module.exports = Troubleshooter;
