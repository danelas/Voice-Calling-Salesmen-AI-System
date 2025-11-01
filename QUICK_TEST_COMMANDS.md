# 🚀 Quick Test Commands

## 📞 Test a Single Call (Easiest)
```bash
curl -X POST https://voice-calling-salesmen-ai-system.onrender.com/api/calls/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "YOUR_PHONE_NUMBER"}'
```

## 👤 Add Test User
```bash
curl -X POST https://voice-calling-salesmen-ai-system.onrender.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User", 
    "phone": "YOUR_PHONE_NUMBER",
    "email": "test@example.com",
    "city": "Miami",
    "state": "FL",
    "homeValue": 500000,
    "exactAge": 40,
    "language": "en"
  }'
```

## ⏰ Schedule a Call (Tomorrow 10 AM)
```bash
curl -X POST https://voice-calling-salesmen-ai-system.onrender.com/api/calls/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "LEAD_ID_FROM_ABOVE",
    "scheduledAt": "2024-11-02T10:00:00Z",
    "callType": "COLD_CALL",
    "notes": "Test scheduled call"
  }'
```

## 🎯 Start Small Campaign (2 calls, 60s apart)
```bash
curl -X POST https://voice-calling-salesmen-ai-system.onrender.com/api/bulk/start-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "leadIds": ["lead1", "lead2"],
    "campaignName": "Test Campaign",
    "delayBetweenCalls": 60,
    "maxConcurrentCalls": 1
  }'
```

## 📊 Check System Health
```bash
curl https://voice-calling-salesmen-ai-system.onrender.com/api/health
```

## 🔍 View All Calls
```bash
curl https://voice-calling-salesmen-ai-system.onrender.com/api/calls
```

Replace `voice-calling-salesmen-ai-system.onrender.com` with your actual Render URL!
