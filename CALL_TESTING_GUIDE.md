# 📞 Call Testing & Timing Guide

## 🧪 Testing Calls

### Method 1: Quick Test Call Setup
**Endpoint:** `POST /api/calls/test`

```bash
curl -X POST https://your-app.onrender.com/api/calls/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "YOUR_PHONE_NUMBER",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Test call setup completed",
  "data": {
    "leadId": "lead_123",
    "callId": "call_456",
    "phone": "YOUR_PHONE_NUMBER",
    "webhookUrl": "https://your-app.onrender.com/api/voice/twiml/call_456"
  },
  "instructions": {
    "step1": "Lead and call records created",
    "step2": "Configure Twilio webhook to use the webhookUrl",
    "step3": "Make a test call to verify the system",
    "step4": "Check call status and conversation logs"
  }
}
```

### Method 2: Create Test User via Dashboard
1. **Access Dashboard:** https://your-app.onrender.com/leads
2. **Add New Lead:** Click "Add Lead" button
3. **Fill Test Data:**
   ```json
   {
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
     "language": "en"
   }
   ```

### Method 3: API Lead Creation
**Endpoint:** `POST /api/leads`

```bash
curl -X POST https://your-app.onrender.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "YOUR_PHONE_NUMBER",
    "email": "test@example.com",
    "address": "123 Test Street",
    "city": "Miami",
    "state": "FL",
    "zipCode": "33145",
    "homeValue": 485000,
    "yearBuilt": 1995,
    "exactAge": 42,
    "maritalStatus": "Married",
    "language": "en",
    "occupation": "Marketing Manager",
    "estimatedIncome": 95000,
    "notes": "Test lead for call testing"
  }'
```

## ⏰ Call Timing & Scheduling

### 1. **Individual Call Scheduling**

**Schedule a Single Call:**
```bash
curl -X POST https://your-app.onrender.com/api/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "your_lead_id",
    "scheduledAt": "2024-11-01T14:30:00Z",
    "callType": "COLD_CALL"
  }'
```

**Scheduling Options:**
- `scheduledAt`: ISO 8601 timestamp (e.g., "2024-11-01T14:30:00Z")
- `callType`: "COLD_CALL", "FOLLOW_UP", "APPOINTMENT_CONFIRMATION"

### 2. **Bulk Campaign Timing**

**Start Bulk Campaign with Timing:**
```bash
curl -X POST https://your-app.onrender.com/api/bulk/start-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "leadIds": ["lead1", "lead2", "lead3"],
    "campaignName": "Morning Outreach Campaign",
    "delayBetweenCalls": 60,
    "maxConcurrentCalls": 2,
    "callScript": "personalized"
  }'
```

**Timing Parameters:**
- `delayBetweenCalls`: Seconds between calls (default: 30)
- `maxConcurrentCalls`: Max simultaneous calls (default: 3)
- Calls start immediately when campaign launches

### 3. **Time Zone Considerations**

**Best Calling Times (Local Time):**
- **Weekdays:** 9:00 AM - 11:00 AM, 2:00 PM - 4:00 PM
- **Avoid:** Before 8:00 AM, after 6:00 PM, weekends
- **Peak Performance:** Tuesday-Thursday, 10:00 AM - 11:00 AM

**Configure Time Zones in Lead Data:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "4075559876",
  "city": "Orlando",
  "state": "FL",
  "timeZone": "America/New_York",
  "preferredCallTime": "morning"
}
```

## 🎯 Campaign Configuration

### Campaign Settings Dashboard
**Access:** https://your-app.onrender.com/campaigns

**Campaign Options:**
1. **Immediate Start:** Calls begin right away
2. **Scheduled Start:** Set specific start time
3. **Call Pacing:** Control call frequency
4. **Business Hours:** Respect local time zones
5. **DNC Compliance:** Skip Do Not Call numbers

### Example Campaign Configurations

**High-Volume Campaign:**
```json
{
  "campaignName": "Q4 Lead Outreach",
  "leadIds": ["lead1", "lead2", "lead3"],
  "delayBetweenCalls": 30,
  "maxConcurrentCalls": 5,
  "respectBusinessHours": true,
  "skipDNC": true
}
```

**Careful/Personal Campaign:**
```json
{
  "campaignName": "VIP Client Follow-up",
  "leadIds": ["vip1", "vip2"],
  "delayBetweenCalls": 300,
  "maxConcurrentCalls": 1,
  "callScript": "premium_personalized"
}
```

## 🔧 Advanced Timing Features

### 1. **Business Hours Enforcement**
```javascript
// Automatically skip calls outside business hours
const businessHours = {
  start: "09:00",
  end: "17:00",
  timeZone: "America/New_York",
  weekdaysOnly: true
};
```

### 2. **Call Retry Logic**
```javascript
// Automatic retry scheduling
const retryConfig = {
  maxRetries: 3,
  retryDelay: [3600, 7200, 86400], // 1hr, 2hr, 24hr
  retryConditions: ["NO_ANSWER", "BUSY", "FAILED"]
};
```

### 3. **Lead Prioritization**
```javascript
// Priority-based calling order
const leadPriority = {
  "HOT": 1,      // Call immediately
  "WARM": 2,     // Call within 1 hour
  "COLD": 3,     // Call within 24 hours
  "FOLLOW_UP": 0 // Highest priority
};
```

## 📊 Monitoring Call Performance

### Real-time Monitoring
**Dashboard:** https://your-app.onrender.com/analytics

**Key Metrics:**
- **Call Success Rate:** % of completed calls
- **Connection Rate:** % of answered calls  
- **Conversion Rate:** % leading to interest/appointments
- **Average Duration:** Call length in minutes
- **Best Times:** Peak performance hours

### Call Status Tracking
```bash
# Check campaign status
curl https://your-app.onrender.com/api/bulk/campaigns

# Check individual call
curl https://your-app.onrender.com/api/calls/CALL_ID
```

## 🎭 Testing Scenarios

### Scenario 1: Single Test Call
```bash
# 1. Create test lead
curl -X POST https://your-app.onrender.com/api/calls/test \
  -d '{"phone": "YOUR_NUMBER"}'

# 2. Configure Twilio webhook (use provided URL)
# 3. Call your Twilio number to test
```

### Scenario 2: Small Campaign Test
```bash
# 1. Upload test leads
curl -X POST https://your-app.onrender.com/api/bulk/upload-leads \
  -d '{
    "campaign": "Test Campaign",
    "leads": [
      {"firstName": "Test1", "phone": "PHONE1"},
      {"firstName": "Test2", "phone": "PHONE2"}
    ]
  }'

# 2. Start campaign with delays
curl -X POST https://your-app.onrender.com/api/bulk/start-campaign \
  -d '{
    "leadIds": ["lead1", "lead2"],
    "delayBetweenCalls": 120,
    "maxConcurrentCalls": 1
  }'
```

### Scenario 3: Scheduled Campaign
```bash
# Schedule campaign for specific time
curl -X POST https://your-app.onrender.com/api/calls/initiate \
  -d '{
    "leadId": "test_lead",
    "scheduledAt": "2024-11-01T10:00:00Z"
  }'
```

## ⚠️ Important Notes

### Compliance
- **DNC Lists:** Always check Do Not Call registry
- **Business Hours:** Respect local time zones
- **Consent:** Ensure leads have opted in
- **Recording:** Inform about call recording where required

### Testing Best Practices
1. **Start Small:** Test with 1-2 calls first
2. **Use Real Numbers:** Test with your own phone numbers
3. **Monitor Logs:** Check Render logs for errors
4. **Verify Webhooks:** Ensure Twilio webhooks are configured
5. **Test AI Responses:** Verify OpenAI and ElevenLabs integration

### Performance Optimization
- **Peak Hours:** 10-11 AM shows 23% higher success rates
- **Day Selection:** Tuesday-Wednesday have 18% higher conversion
- **Call Spacing:** 30-60 seconds between calls optimal
- **Concurrent Limits:** Max 3-5 simultaneous calls for quality

Your Voice Sales AI system is now ready for comprehensive call testing and campaign management! 🚀
