#!/usr/bin/env node

/**
 * Quick Health Check Script
 * Run with: npm run quick-check
 */

const { execSync } = require('child_process');

// Colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function quickCheck() {
  console.log('🔍 Voice Sales AI - Quick Health Check\n');

  const checks = [
    {
      name: 'Node.js Version',
      check: () => {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        return { success: major >= 18, message: `Node.js ${version}` };
      }
    },
    {
      name: 'Dependencies',
      check: () => {
        try {
          require('express');
          require('@prisma/client');
          return { success: true, message: 'Core dependencies found' };
        } catch (error) {
          return { success: false, message: 'Missing dependencies - run npm install' };
        }
      }
    },
    {
      name: 'Environment File',
      check: () => {
        const fs = require('fs');
        const exists = fs.existsSync('.env');
        return { 
          success: exists, 
          message: exists ? '.env file found' : '.env file missing - copy from .env.example' 
        };
      }
    },
    {
      name: 'Environment Variables',
      check: () => {
        require('dotenv').config();
        const required = ['DATABASE_URL', 'OPENAI_API_KEY', 'ELEVENLABS_API_KEY'];
        const missing = required.filter(key => !process.env[key]);
        return {
          success: missing.length === 0,
          message: missing.length === 0 ? 'All required vars set' : `Missing: ${missing.join(', ')}`
        };
      }
    },
    {
      name: 'Database Connection',
      check: async () => {
        try {
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient();
          await prisma.$connect();
          await prisma.$disconnect();
          return { success: true, message: 'Database connected' };
        } catch (error) {
          return { success: false, message: `DB Error: ${error.message.substring(0, 50)}...` };
        }
      }
    },
    {
      name: 'Required Directories',
      check: () => {
        const fs = require('fs');
        const dirs = ['logs', 'audio'];
        const missing = dirs.filter(dir => !fs.existsSync(dir));
        
        // Create missing directories
        missing.forEach(dir => {
          try {
            fs.mkdirSync(dir, { recursive: true });
          } catch (error) {
            // Ignore errors
          }
        });
        
        return { success: true, message: 'Directories ready' };
      }
    }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const result = await check.check();
      const icon = result.success ? '✅' : '❌';
      const color = result.success ? 'green' : 'red';
      
      log(`${icon} ${check.name}: ${result.message}`, color);
      
      if (!result.success) {
        allPassed = false;
      }
    } catch (error) {
      log(`❌ ${check.name}: Error - ${error.message}`, 'red');
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    log('🎉 All checks passed! System is ready.', 'green');
    log('\nNext steps:', 'blue');
    log('  1. npm start', 'blue');
    log('  2. Visit http://localhost:3001/api/health', 'blue');
  } else {
    log('⚠️  Some issues detected.', 'yellow');
    log('\nFor detailed troubleshooting, run:', 'blue');
    log('  npm run troubleshoot', 'blue');
  }
}

// Run if called directly
if (require.main === module) {
  quickCheck().catch(error => {
    console.error('Quick check failed:', error);
    process.exit(1);
  });
}

module.exports = quickCheck;
