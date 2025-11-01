# Twilio Voice Integration Setup Guide

## 🎯 **TextMagic vs Twilio - What You Need to Know**

### **TextMagic (Current)**
- ✅ **SMS messaging** - Send text messages
- ✅ **Bulk SMS campaigns** - Marketing texts
- ✅ **SMS notifications** - Follow-up messages
- ❌ **No voice calls** - Cannot make phone calls
- ❌ **No phone numbers for calling**

### **Twilio (Recommended for Voice)**
- ✅ **Voice calls** - Real phone calls with AI
- ✅ **Phone numbers** - Rent numbers for calling
- ✅ **Speech-to-text** - Convert customer speech to text
- ✅ **Text-to-speech** - AI speaks to customers
- ✅ **Call recording** - Record calls for analysis
- ✅ **Voicemail detection** - Handle voicemail automatically

## 🚀 **Setting Up Twilio for Voice Calls**

### **1. Create Twilio Account**
1. Go to https://www.twilio.com/
2. Sign up for a free account
3. Verify your phone number
4. Get $15 free credit for testing

### **2. Get Your Credentials**
1. Go to Twilio Console Dashboard
2. Find your **Account SID** and **Auth Token**
3. Copy these to your `.env` file:

```env
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
```

### **3. Purchase a Phone Number**
```bash
# Option 1: Use the API (automatic)
curl -X POST http://localhost:3001/api/voice/numbers/purchase \
  -H "Content-Type: application/json" \
  -d '{"areaCode": "415"}'

# Option 2: Manual via Twilio Console
# 1. Go to Phone Numbers → Manage → Buy a number
# 2. Choose a number with Voice capabilities
# 3. Purchase it ($1/month typically)
```

### **4. Configure Your Environment**
Update your `.env` file:
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+14155551234"  # Your purchased number
BASE_URL="http://localhost:3001"    # For webhooks
```

### **5. Install Dependencies**
```bash
npm install twilio
```

## 📞 **How Voice Calls Work**

### **Call Flow**
```
1. Your App → Twilio: "Call +1234567890"
2. Twilio → Customer: Phone rings
3. Customer: "Hello?"
4. Twilio → Your App: "Customer answered"
5. Your App → AI: Generate greeting
6. AI → Twilio: "Hi, this is Sarah from..."
7. Twilio → Customer: AI speaks
8. Customer → Twilio: Customer responds
9. Twilio → Your App: Speech-to-text
10. Your App → AI: Process response
11. AI → Your App: Generate reply
12. Repeat until call ends
```

### **Real Voice Call Example**
```javascript
// Initiate a call
const TwilioVoiceService = require('./services/twilioVoiceService');
const twilioVoice = new TwilioVoiceService();

// Start a call
const call = await twilioVoice.initiateCall(
  '+1234567890',  // Customer phone
  'call-123',     // Your call ID
  {               // Lead data
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Corp'
  }
);

// Twilio handles the rest via webhooks!
```

## 🎙️ **Voice Features You Get**

### **1. Real-Time Conversation**
- Customer speaks → Converted to text
- AI processes → Generates response
- Response converted to speech → Customer hears

### **2. Intelligent Call Handling**
- **Voicemail Detection** - Leaves appropriate message
- **Busy Signal** - Schedules callback
- **No Answer** - Marks for retry
- **Call Recording** - Saves for analysis

### **3. Advanced Analytics**
- **Call Duration** - How long each call lasted
- **Speech Confidence** - How clear the audio was
- **Conversation Flow** - Full transcript with timestamps
- **Outcome Tracking** - Success/failure reasons

## 💰 **Pricing Comparison**

### **TextMagic (SMS Only)**
- SMS: ~$0.04 per message
- No voice capabilities

### **Twilio (Voice + SMS)**
- **Phone Number**: $1/month
- **Outbound Calls**: $0.013/minute (US)
- **Speech-to-Text**: $0.02/minute
- **Text-to-Speech**: $0.016/1000 characters
- **SMS**: $0.0075 per message

**Example Cost for 100 calls (3 min avg):**
- Calls: 300 minutes × $0.013 = $3.90
- Speech-to-Text: 300 minutes × $0.02 = $6.00
- Text-to-Speech: ~$2.00
- **Total: ~$12 for 100 calls**

## 🔧 **API Endpoints Added**

### **Voice Call Management**
```bash
# Start a voice call (integrated with existing /api/calls/initiate)
POST /api/calls/initiate
{
  "leadId": "lead-123",
  "useVoice": true  # New parameter for voice calls
}

# List purchased phone numbers
GET /api/voice/numbers

# Purchase new phone number
POST /api/voice/numbers/purchase
{
  "areaCode": "415"
}
```

### **Webhook Endpoints (Twilio calls these)**
```bash
# Twilio webhooks (handled automatically)
POST /api/voice/twiml/:callId      # Generate AI speech
POST /api/voice/gather/:callId     # Process customer speech
POST /api/voice/status/:callId     # Call status updates
POST /api/voice/recording/:callId  # Recording completion
```

## 🎯 **Upgrading Your Current System**

### **Option 1: Keep Both (Recommended)**
- **Twilio** for voice calls
- **TextMagic** for SMS follow-ups
- Best of both worlds

### **Option 2: Twilio Only**
- **Twilio** for both voice and SMS
- Simpler setup, single provider
- Slightly higher SMS costs

### **Current Call Flow Update**
```javascript
// OLD: Text-only simulation
await textMagic.simulateCall(lead.phone);

// NEW: Real voice call
await twilioVoice.initiateCall(lead.phone, callId, lead);
```

## 🚀 **Getting Started**

### **1. Test with Free Credits**
```bash
# 1. Set up Twilio account (get $15 free)
# 2. Add credentials to .env
# 3. Purchase a phone number ($1)
# 4. Test with your own phone first
```

### **2. Make Your First Voice Call**
```bash
# Start your server
npm start

# Initiate a test call via API
curl -X POST http://localhost:3001/api/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "your-test-lead-id",
    "useVoice": true
  }'
```

### **3. Monitor in Dashboard**
- Go to `http://localhost:3000/conversations`
- See real-time conversation transcripts
- Watch AI and customer interactions
- Analyze call performance

## 🔍 **Testing & Debugging**

### **Test Call Flow**
```bash
# 1. Call your own phone number first
# 2. Check Twilio console for call logs
# 3. Verify webhooks are working
# 4. Test with different scenarios
```

### **Common Issues**
1. **Webhooks not working** - Check BASE_URL in .env
2. **No audio** - Verify TwiML generation
3. **Call fails** - Check phone number format
4. **High costs** - Monitor call duration limits

## 🎉 **What You Get**

### **Before (TextMagic)**
- Simulated calls in dashboard
- No real voice interaction
- SMS-only follow-ups

### **After (Twilio)**
- **Real phone calls** with AI voice
- **Live conversation transcripts** in dashboard
- **Actual customer interactions**
- **Professional sales calls** at scale
- **Voicemail handling**
- **Call recordings** for training

## 🚀 **Next Steps**

1. **Set up Twilio account** (5 minutes)
2. **Add credentials** to `.env` file
3. **Purchase phone number** ($1)
4. **Test with your phone** first
5. **Start making real sales calls!**

Your Voice Sales AI system will transform from a simulation into a **real, professional calling system** that can handle hundreds of calls per day! 📞✨
