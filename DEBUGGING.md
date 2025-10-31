# Voice Sales AI - Debugging Guide

## 🔧 Common Issues & Solutions

### 1. Database Connection Issues

#### **Error**: `ECONNREFUSED` or `Connection refused`
```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causes & Solutions:**
- **PostgreSQL not running**: Start PostgreSQL service
  ```bash
  # Windows
  net start postgresql-x64-14
  
  # macOS
  brew services start postgresql
  
  # Linux
  sudo systemctl start postgresql
  ```

- **Wrong DATABASE_URL**: Check your `.env` file
  ```env
  DATABASE_URL="postgresql://username:password@localhost:5432/voice_sales_ai"
  ```

- **Database doesn't exist**: Create the database
  ```bash
  createdb voice_sales_ai
  npx prisma migrate dev
  ```

#### **Error**: `Authentication failed`
```bash
Error: password authentication failed for user "username"
```

**Solutions:**
- Verify username and password in DATABASE_URL
- Check PostgreSQL user permissions
- Reset PostgreSQL password if needed

#### **Error**: `Database does not exist`
```bash
Error: database "voice_sales_ai" does not exist
```

**Solutions:**
```bash
# Create database
createdb voice_sales_ai

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 2. API Key Issues

#### **OpenAI API Errors**

**Error**: `Invalid API key`
```bash
Error: Incorrect API key provided
```

**Solutions:**
- Get valid API key from https://platform.openai.com/api-keys
- Ensure key starts with `sk-`
- Check API key has GPT-4 access
- Verify no extra spaces in `.env` file

**Error**: `Rate limit exceeded`
```bash
Error: Rate limit reached for requests
```

**Solutions:**
- Wait for rate limit reset
- Upgrade OpenAI plan
- Implement request queuing
- Add retry logic with exponential backoff

**Error**: `Insufficient quota`
```bash
Error: You exceeded your current quota
```

**Solutions:**
- Add payment method to OpenAI account
- Check billing limits
- Monitor usage in OpenAI dashboard

#### **ElevenLabs API Errors**

**Error**: `Invalid API key`
```bash
Error: 401 Unauthorized
```

**Solutions:**
- Get API key from ElevenLabs profile
- Verify key in `.env` file
- Check key hasn't expired

**Error**: `Quota exceeded`
```bash
Error: Character limit exceeded
```

**Solutions:**
- Upgrade ElevenLabs plan
- Monitor character usage
- Implement text chunking for long content

**Error**: `Voice not found`
```bash
Error: Voice ID not found
```

**Solutions:**
- Check available voices: `GET https://api.elevenlabs.io/v1/voices`
- Update `ELEVENLABS_VOICE_ID` in `.env`
- Use default voice if custom voice unavailable

#### **TextMagic API Errors**

**Error**: `Authentication failed`
```bash
Error: Invalid username or API key
```

**Solutions:**
- Verify `TEXTMAGIC_USERNAME` and `TEXTMAGIC_API_KEY`
- Check credentials in TextMagic dashboard
- Ensure account is active

**Error**: `Invalid phone number`
```bash
Error: Invalid phone number format
```

**Solutions:**
- Use international format: `+1234567890`
- Validate phone numbers before sending
- Check country code requirements

### 3. Call Processing Issues

#### **Error**: Call initialization fails
```bash
Error: Lead not found
```

**Debug Steps:**
```javascript
// Check if lead exists
const lead = await prisma.lead.findUnique({
  where: { id: leadId }
});

if (!lead) {
  console.log('Lead not found:', leadId);
  // Create lead or use valid ID
}
```

#### **Error**: Audio generation fails
```bash
Error: Failed to generate speech
```

**Debug Steps:**
1. Check ElevenLabs API key
2. Verify text content isn't empty
3. Check character limits
4. Test with simple text first

#### **Error**: Conversation processing fails
```bash
Error: Failed to generate sales response
```

**Debug Steps:**
1. Check OpenAI API key and quota
2. Verify conversation history format
3. Check prompt length limits
4. Test with simpler inputs

### 4. File System Issues

#### **Error**: Permission denied
```bash
Error: EACCES: permission denied, mkdir '/app/audio'
```

**Solutions:**
```bash
# Create directories with proper permissions
mkdir -p logs audio temp
chmod 755 logs audio temp

# Or run with sudo (not recommended for production)
sudo npm start
```

#### **Error**: Disk space full
```bash
Error: ENOSPC: no space left on device
```

**Solutions:**
- Clean up old log files
- Implement log rotation
- Monitor disk usage
- Clean audio files periodically

### 5. Memory & Performance Issues

#### **Error**: Out of memory
```bash
Error: JavaScript heap out of memory
```

**Solutions:**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server.js

# Or in package.json
"start": "node --max-old-space-size=4096 server.js"
```

#### **Error**: Slow API responses
**Debug Steps:**
1. Check database query performance
2. Monitor API response times
3. Implement caching
4. Optimize database indexes

### 6. Environment Configuration Issues

#### **Error**: Missing environment variables
```bash
Error: OPENAI_API_KEY is required
```

**Solutions:**
1. Copy `.env.example` to `.env`
2. Fill in all required variables
3. Restart the application
4. Verify `.env` file is in project root

#### **Error**: Port already in use
```bash
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**
```bash
# Find process using port
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change port
PORT=3002 npm start
```

## 🛠️ Debugging Tools

### 1. Health Check Endpoint
```bash
# Check system health
curl http://localhost:3001/api/health

# Expected response
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Database Diagnostics
```javascript
// Run in Node.js console
const { PrismaClient } = require('@prisma/client');
const SystemDebugger = require('./utils/debugger');

const prisma = new PrismaClient();

// Test database connection
SystemDebugger.diagnoseDatabaseIssues(prisma)
  .then(result => console.log(result));
```

### 3. API Key Testing
```javascript
// Test all API keys
SystemDebugger.testApiKeys()
  .then(result => console.log(result));
```

### 4. Comprehensive Health Check
```javascript
// Full system diagnostic
SystemDebugger.performHealthCheck(prisma)
  .then(result => console.log(JSON.stringify(result, null, 2)));
```

### 5. Log Analysis
```bash
# View recent errors
tail -f logs/error.log

# Search for specific errors
grep "DATABASE_ERROR" logs/error.log

# View API logs
tail -f logs/api.log
```

## 📊 Monitoring & Logging

### Log Files Location
```
logs/
├── error.log          # Error logs only
├── combined.log       # All logs
├── api.log           # API request logs
└── calls.log         # Call-specific logs
```

### Log Levels
- **ERROR**: System errors, API failures
- **WARN**: Performance issues, validation errors
- **INFO**: Successful operations, health checks
- **DEBUG**: Detailed debugging information

### Custom Debug Logging
```javascript
const { DebugLogger } = require('./utils/logger');

// Log database errors
DebugLogger.logDatabaseError(error, 'user_creation', query);

// Log API errors
DebugLogger.logOpenAIError(error, 'generate_response', requestData);

// Log performance issues
DebugLogger.logPerformanceIssue('call_processing', 8500, 5000);

// Log successful operations
DebugLogger.logSuccess('call_completed', { callId, duration, outcome });
```

## 🚨 Emergency Troubleshooting

### System Won't Start
1. **Check Node.js version**: `node --version` (requires 18+)
2. **Verify dependencies**: `npm install`
3. **Check environment**: Copy `.env.example` to `.env`
4. **Test database**: `npx prisma migrate dev`
5. **Check ports**: Ensure port 3001 is available

### Database Issues
1. **Reset database**:
   ```bash
   npx prisma migrate reset
   npx prisma migrate dev
   npx prisma generate
   ```

2. **Check connection**:
   ```bash
   npx prisma studio
   ```

### API Issues
1. **Test endpoints manually**:
   ```bash
   curl -X GET http://localhost:3001/api/health
   curl -X GET http://localhost:3001/api/leads
   ```

2. **Check API keys**:
   ```javascript
   console.log('OpenAI:', !!process.env.OPENAI_API_KEY);
   console.log('ElevenLabs:', !!process.env.ELEVENLABS_API_KEY);
   ```

### Performance Issues
1. **Monitor resources**:
   ```javascript
   console.log('Memory:', process.memoryUsage());
   console.log('Uptime:', process.uptime());
   ```

2. **Check database performance**:
   ```bash
   npx prisma studio
   # Look for slow queries in logs
   ```

## 📞 Getting Help

### Debug Information to Collect
When reporting issues, include:

1. **System Information**:
   ```bash
   node --version
   npm --version
   cat package.json | grep version
   ```

2. **Environment**:
   ```bash
   echo $NODE_ENV
   # Don't share actual API keys!
   ```

3. **Error Logs**:
   ```bash
   tail -50 logs/error.log
   ```

4. **Health Check Results**:
   ```javascript
   // Run health check and share results
   SystemDebugger.generateDebugReport(prisma)
   ```

### Common Solutions Checklist
- [ ] All environment variables set
- [ ] Database running and accessible
- [ ] API keys valid and have quota
- [ ] Required directories exist with permissions
- [ ] Port 3001 available
- [ ] Node.js version 18+
- [ ] Dependencies installed
- [ ] Prisma client generated

### Support Resources
- Check `logs/` directory for detailed error information
- Use health check endpoints for system status
- Run diagnostic tools for specific components
- Monitor resource usage for performance issues

Remember: Most issues are related to configuration, API keys, or database connectivity. Start with the basics and work your way up to more complex debugging.
