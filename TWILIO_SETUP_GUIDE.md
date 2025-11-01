# 🚀 Twilio Setup Guide for Voice Calls

## 📋 Required Environment Variables

Add these to your Render environment variables:

```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here  
TWILIO_PHONE_NUMBER=+1234567890
BASE_URL=https://voice-calling-salesmen-ai-system.onrender.com
```

## 🔧 How to Get Twilio Credentials

### 1. **Twilio Account SID & Auth Token**
- Go to [Twilio Console](https://console.twilio.com/)
- Find "Account SID" and "Auth Token" on the dashboard
- Copy both values

### 2. **Twilio Phone Number**
- Go to Phone Numbers → Manage → Active numbers
- Copy your Twilio phone number (format: +1234567890)

### 3. **Webhook Configuration**
Your webhook is already correctly configured:
```
https://voice-calling-salesmen-ai-system.onrender.com/api/voice/incoming
```

## ⚡ Quick Test

Once environment variables are set, test with:

```bash
curl -X POST https://voice-calling-salesmen-ai-system.onrender.com/api/calls/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "+19546144683", "firstName": "Dan", "lastName": "Test"}'
```

## 🎯 What Happens When You Click "Call"

1. **System creates call record** ✅ (Working)
2. **Twilio makes actual phone call** ❌ (Needs env vars)
3. **AI conversation starts** ❌ (Needs env vars)
4. **Call gets recorded and analyzed** ❌ (Needs env vars)

## 🚨 Current Status

- ✅ **Webhook configured correctly**
- ✅ **Call initiation API working**
- ❌ **Missing Twilio credentials**
- ❌ **No actual phone calls made**

## 🔥 Next Steps

1. **Add Twilio environment variables** to Render
2. **Redeploy the service**
3. **Test call button** - should make real calls!

## 📞 Environment Variables Template

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# Base URL
BASE_URL=https://voice-calling-salesmen-ai-system.onrender.com

# Optional: OpenAI for AI conversations
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: ElevenLabs for voice synthesis
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

Once you add these environment variables, the "Call" button will make actual phone calls! 🎉
