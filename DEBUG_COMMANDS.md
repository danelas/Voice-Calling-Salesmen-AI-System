# Voice Sales AI - Debug Commands & Logs Reference

## 🚀 Quick Start Debugging

### 1. **Quick Health Check**
```bash
npm run quick-check
```
**What it does:** Runs a fast system check covering Node.js, dependencies, environment, and database.

### 2. **Comprehensive Troubleshooting**
```bash
npm run troubleshoot
```
**What it does:** Detailed system diagnosis with auto-fix options for common issues.

### 3. **API Health Check**
```bash
curl http://localhost:3001/api/health
# or
curl http://localhost:3001/api/debug/health
```

## 📊 Debug API Endpoints

### System Health
```bash
# Basic health check
GET /api/health

# Comprehensive system health
GET /api/debug/health

# Database diagnostics
GET /api/debug/database

# API key validation
GET /api/debug/api-keys

# Environment validation
GET /api/debug/environment

# System resources
GET /api/debug/resources

# File system check
GET /api/debug/filesystem
```

### Performance Monitoring
```bash
# Performance metrics
GET /api/debug/performance

# Recent error logs
GET /api/debug/logs?hours=24&limit=50

# Full debug report
GET /api/debug/report
```

### Testing
```bash
# Test call functionality
POST /api/debug/test-call
{
  "leadId": "your-lead-id",
  "testMessage": "Hello, this is a test."
}

# Clear old logs (admin)
POST /api/debug/clear-logs
{
  "days": 7
}
```

## 📝 Log Files & Commands

### Log File Locations
```
logs/
├── error.log          # Error logs only
├── combined.log       # All application logs
├── api.log           # API request/response logs
└── calls.log         # Call-specific logs
```

### View Logs in Real-time
```bash
# All logs
npm run logs

# Error logs only
npm run logs:error

# Call logs only
npm run logs:calls

# Manual tail commands
tail -f logs/combined.log
tail -f logs/error.log | grep "ERROR"
```

### Search Logs
```bash
# Search for specific errors
grep "DATABASE_ERROR" logs/error.log
grep "OPENAI_ERROR" logs/error.log
grep "ELEVENLABS_ERROR" logs/error.log

# Search by date
grep "2024-01-01" logs/combined.log

# Search by call ID
grep "call_123" logs/calls.log

# Count error types
grep -c "DATABASE_ERROR" logs/error.log
grep -c "API_KEY_ERROR" logs/error.log
```

## 🔧 Common Debug Scenarios

### 1. **Database Issues**
```bash
# Check database connection
curl http://localhost:3001/api/debug/database

# View database logs
grep "DATABASE" logs/error.log

# Reset database
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
```

### 2. **API Key Problems**
```bash
# Test all API keys
curl http://localhost:3001/api/debug/api-keys

# Check environment
curl http://localhost:3001/api/debug/environment

# View API errors
grep "API_KEY_ERROR" logs/error.log
```

### 3. **Call Processing Issues**
```bash
# Test call functionality
curl -X POST http://localhost:3001/api/debug/test-call \
  -H "Content-Type: application/json" \
  -d '{"leadId": "your-lead-id"}'

# View call logs
tail -f logs/calls.log

# Search for call errors
grep "CALL_ERROR" logs/error.log
```

### 4. **Performance Problems**
```bash
# Check system resources
curl http://localhost:3001/api/debug/resources

# Monitor performance
curl http://localhost:3001/api/debug/performance

# View performance warnings
grep "PERFORMANCE_WARNING" logs/combined.log
```

## 🐛 Error Types & Solutions

### Database Errors
```bash
# Error Pattern: DATABASE_ERROR
grep "DATABASE_ERROR" logs/error.log

# Common Solutions:
# 1. Check if PostgreSQL is running
# 2. Verify DATABASE_URL in .env
# 3. Run: npx prisma migrate dev
```

### API Key Errors
```bash
# Error Pattern: API_KEY_ERROR
grep "API_KEY_ERROR" logs/error.log

# Common Solutions:
# 1. Check .env file exists
# 2. Verify API keys are correct
# 3. Check API quotas/billing
```

### Call Processing Errors
```bash
# Error Pattern: CALL_ERROR
grep "CALL_ERROR" logs/error.log

# Common Solutions:
# 1. Check lead exists
# 2. Verify AI service connectivity
# 3. Check audio file permissions
```

### Validation Errors
```bash
# Error Pattern: VALIDATION_ERROR
grep "VALIDATION_ERROR" logs/combined.log

# Common Solutions:
# 1. Check request format
# 2. Verify required fields
# 3. Validate phone number format
```

## 📈 Monitoring Commands

### System Health Monitoring
```bash
# Continuous health check (every 30 seconds)
watch -n 30 'curl -s http://localhost:3001/api/health | jq'

# Monitor error rate
watch -n 10 'grep -c "ERROR" logs/error.log'

# Monitor active processes
ps aux | grep node
```

### Performance Monitoring
```bash
# Monitor memory usage
watch -n 5 'curl -s http://localhost:3001/api/debug/resources | jq .resources.memory'

# Monitor database performance
watch -n 10 'curl -s http://localhost:3001/api/debug/performance | jq .performance.database'
```

### Log Analysis
```bash
# Error summary (last 24 hours)
grep "$(date '+%Y-%m-%d')" logs/error.log | cut -d' ' -f3 | sort | uniq -c

# Most common errors
grep "ERROR" logs/error.log | grep -o '"type":"[^"]*"' | sort | uniq -c | sort -nr

# API endpoint usage
grep "GET\|POST\|PUT\|DELETE" logs/api.log | awk '{print $7}' | sort | uniq -c | sort -nr
```

## 🔍 Advanced Debugging

### Interactive Debugging
```javascript
// In Node.js console
const { PrismaClient } = require('@prisma/client');
const SystemDebugger = require('./utils/debugger');
const { DebugLogger } = require('./utils/logger');

const prisma = new PrismaClient();

// Run diagnostics
SystemDebugger.performHealthCheck(prisma).then(console.log);

// Test specific components
SystemDebugger.testApiKeys().then(console.log);
SystemDebugger.checkSystemResources();
```

### Custom Logging
```javascript
// Add custom debug logs
const { DebugLogger } = require('./utils/logger');

// Log custom events
DebugLogger.logSuccess('Custom operation', { data: 'example' });
DebugLogger.logPerformanceIssue('slow_query', 5000, 1000);
DebugLogger.logCallError('call_123', new Error('Test'), 'processing');
```

### Environment Debugging
```bash
# Check all environment variables
printenv | grep -E "(DATABASE|OPENAI|ELEVENLABS|TEXTMAGIC)"

# Validate environment
node -e "
require('dotenv').config();
console.log('DATABASE_URL:', !!process.env.DATABASE_URL);
console.log('OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY);
console.log('ELEVENLABS_API_KEY:', !!process.env.ELEVENLABS_API_KEY);
"
```

## 🚨 Emergency Debugging

### System Won't Start
```bash
# 1. Check Node version
node --version

# 2. Install dependencies
npm install

# 3. Check environment
cp .env.example .env
# Edit .env with your keys

# 4. Setup database
npx prisma migrate dev
npx prisma generate

# 5. Quick check
npm run quick-check

# 6. Start with debug
DEBUG=* npm start
```

### Complete Reset
```bash
# Nuclear option - reset everything
rm -rf node_modules
rm -rf logs
npm install
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
npm run quick-check
npm start
```

### Debug Mode Startup
```bash
# Start with maximum logging
NODE_ENV=development LOG_LEVEL=debug npm start

# Start with specific debugging
DEBUG=express:* npm start
DEBUG=prisma:* npm start
```

## 📞 Getting Help

### Information to Collect
```bash
# System info
node --version
npm --version
cat package.json | grep version

# Environment check
npm run quick-check

# Recent errors
tail -50 logs/error.log

# System health
curl -s http://localhost:3001/api/debug/health | jq

# Debug report
curl -s http://localhost:3001/api/debug/report | jq > debug-report.json
```

### Log Cleanup
```bash
# Clean old logs
npm run logs:clear

# Or manually
> logs/error.log
> logs/combined.log
> logs/api.log
> logs/calls.log
```

Remember: Most issues can be resolved by checking the logs and running the troubleshooting script. Start with `npm run quick-check` and escalate to `npm run troubleshoot` if needed.
