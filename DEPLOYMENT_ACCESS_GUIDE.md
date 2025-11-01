# Deployment Access & Testing Guide

## 🚀 Accessing Your Dashboard After Deployment

### 1. **Dashboard URL**
Once deployed on Render, your dashboard will be available at:
```
https://your-app-name.onrender.com
```

**Example:** If your Render app is named `voice-sales-ai`, access at:
```
https://voice-sales-ai.onrender.com
```

### 2. **Dashboard Pages Available**
- **Main Dashboard:** `/` - Overview, stats, recent activity
- **Conversations:** `/conversations` - All call conversations and transcripts
- **Leads:** `/leads` - Lead management and upload
- **Analytics:** `/analytics` - Call performance and metrics
- **Settings:** `/settings` - System configuration

### 3. **API Health Check**
Verify your deployment is working:
```
https://your-app-name.onrender.com/api/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "2024-10-31T21:35:00.000Z",
  "version": "1.0.0",
  "uptime": 1234,
  "database": "connected"
}
```

## 📞 Testing User Calls

### Method 1: Test Call API (Recommended for Development)

**Endpoint:** `POST /api/debug/test-call`

**Example using curl:**
```bash
curl -X POST https://your-app-name.onrender.com/api/debug/test-call \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "your-lead-id",
    "testMessage": "Hello, this is a test call from our AI system."
  }'
```

**Example using JavaScript:**
```javascript
fetch('https://your-app-name.onrender.com/api/debug/test-call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leadId: 'your-lead-id',
    testMessage: 'Hello, this is a test call.'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

**Response:**
```json
{
  "success": true,
  "message": "Test call completed successfully",
  "results": {
    "tests": {
      "openai": { "success": true, "response": "AI response text" },
      "elevenlabs": { "success": true, "audioUrl": "audio-file-url" },
      "textmagic": { "success": true, "message": "SMS simulation" }
    },
    "allTestsPassed": true
  }
}
```

### Method 2: Real Call Testing (Production)

#### Step 1: Create a Test Lead
```bash
curl -X POST https://your-app-name.onrender.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "YOUR_PHONE_NUMBER",
    "email": "test@example.com",
    "address": "123 Test Street",
    "city": "Test City",
    "state": "FL",
    "zipCode": "12345",
    "homeValue": 300000,
    "exactAge": 35,
    "language": "en",
    "notes": "Test lead for call testing"
  }'
```

#### Step 2: Initiate a Real Call
```bash
curl -X POST https://your-app-name.onrender.com/api/calls \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "LEAD_ID_FROM_STEP_1",
    "callType": "test_call"
  }'
```

### Method 3: Bulk Campaign Testing

#### Upload Test Leads
```bash
curl -X POST https://your-app-name.onrender.com/api/bulk/upload-leads \
  -H "Content-Type: application/json" \
  -d '{
    "campaign": "Test Campaign",
    "leads": [
      {
        "firstName": "Test1",
        "lastName": "User1", 
        "phone": "YOUR_PHONE_1",
        "email": "test1@example.com"
      },
      {
        "firstName": "Test2",
        "lastName": "User2",
        "phone": "YOUR_PHONE_2", 
        "email": "test2@example.com"
      }
    ]
  }'
```

#### Start Test Campaign
```bash
curl -X POST https://your-app-name.onrender.com/api/bulk/start-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "leadIds": ["lead1", "lead2"],
    "campaignName": "Test Campaign",
    "delayBetweenCalls": 60,
    "maxConcurrentCalls": 1
  }'
```

## 🔧 Twilio Configuration for Real Calls

### 1. **Configure Twilio Webhooks**
In your Twilio Console → Phone Numbers → Active Numbers:

**Voice Configuration:**
- **Webhook URL:** `https://your-app-name.onrender.com/api/voice/incoming`
- **HTTP Method:** POST
- **Fallback URL:** `https://your-app-name.onrender.com/api/voice/incoming`

### 2. **Environment Variables on Render**
Ensure these are set in your Render dashboard:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id
```

## 🧪 Testing Scenarios

### 1. **Basic Functionality Test**
```bash
# Test health endpoint
curl https://your-app-name.onrender.com/api/health

# Test lead creation
curl -X POST https://your-app-name.onrender.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","phone":"1234567890"}'

# Test AI response
curl -X POST https://your-app-name.onrender.com/api/debug/test-call \
  -H "Content-Type: application/json" \
  -d '{"leadId":"your-lead-id"}'
```

### 2. **Voice Integration Test**
```bash
# Test TwiML generation
curl -X POST https://your-app-name.onrender.com/api/voice/twiml/CALL_ID

# Test speech processing
curl -X POST https://your-app-name.onrender.com/api/voice/gather/CALL_ID \
  -H "Content-Type: application/json" \
  -d '{"SpeechResult":"Hello, I am interested in your services"}'
```

### 3. **File Upload Test**
```bash
# Test CSV upload
curl -X POST https://your-app-name.onrender.com/api/bulk/upload-file \
  -F "leadFile=@lead-upload-template.csv" \
  -F "campaign=Test Upload"
```

## 📊 Monitoring & Debugging

### 1. **Check Logs**
- **Render Logs:** View in Render dashboard → Your Service → Logs
- **Debug Endpoint:** `GET /api/debug/health`
- **System Status:** `GET /api/debug/system-info`

### 2. **Common Issues & Solutions**

**Issue: Dashboard not loading**
- Check if app is deployed and running
- Verify health endpoint responds
- Check browser console for errors

**Issue: Calls not working**
- Verify Twilio credentials in environment variables
- Check webhook URLs are correctly configured
- Test with debug endpoints first

**Issue: AI responses failing**
- Verify OpenAI API key is valid
- Check API usage limits
- Test with simple debug call

**Issue: Database connection errors**
- Verify DATABASE_URL is correct
- Check PostgreSQL database is accessible
- Run health check endpoint

### 3. **Debug Endpoints**
```bash
# System health
GET /api/debug/health

# System information
GET /api/debug/system-info

# Test all services
POST /api/debug/test-call

# View recent logs
GET /api/debug/logs
```

## 🎯 Quick Start Testing Checklist

1. ✅ **Access dashboard:** `https://your-app.onrender.com`
2. ✅ **Check health:** `https://your-app.onrender.com/api/health`
3. ✅ **Create test lead:** Use `/api/leads` endpoint
4. ✅ **Run test call:** Use `/api/debug/test-call`
5. ✅ **Configure Twilio:** Set webhook URLs
6. ✅ **Test real call:** Use your phone number
7. ✅ **Upload leads:** Test CSV upload
8. ✅ **Start campaign:** Test bulk calling

## 📱 Mobile Testing
The dashboard is responsive and works on mobile devices. Access the same URL from your phone to manage calls on the go.

## 🔒 Security Notes
- All API endpoints are accessible without authentication in development
- For production, consider adding authentication middleware
- Monitor API usage and rate limits
- Keep environment variables secure
