# 🚀 Quick Access Guide

## 📊 Dashboard Access
```
https://your-app-name.onrender.com
```

## 🔍 Health Check
```
https://your-app-name.onrender.com/api/health
```

## 📞 Quick Test Call Setup
```bash
curl -X POST https://your-app-name.onrender.com/api/calls/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "YOUR_PHONE_NUMBER", "firstName": "Test", "lastName": "User"}'
```

## 📋 Dashboard Pages
- **Main:** `/` - Dashboard overview
- **Calls:** `/conversations` - All conversations
- **Leads:** `/leads` - Lead management  
- **Analytics:** `/analytics` - Performance metrics
- **Settings:** `/settings` - Configuration

## 🧪 Testing Endpoints
- **Health:** `GET /api/health`
- **Test Call:** `POST /api/calls/test`
- **Debug Call:** `POST /api/debug/test-call`
- **Upload Leads:** `POST /api/bulk/upload-file`

## 🔧 Twilio Webhook URLs
- **Voice:** `https://your-app-name.onrender.com/api/voice/incoming`
- **Status:** `https://your-app-name.onrender.com/api/voice/status/{callId}`
- **Recording:** `https://your-app-name.onrender.com/api/voice/recording/{callId}`

## ⚡ Quick Commands
```bash
# Check if app is running
curl https://your-app-name.onrender.com/api/health

# Create test lead and call
curl -X POST https://your-app-name.onrender.com/api/calls/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890"}'

# Upload CSV leads
curl -X POST https://your-app-name.onrender.com/api/bulk/upload-file \
  -F "leadFile=@leads.csv" \
  -F "campaign=Test Campaign"
```

Replace `your-app-name` with your actual Render app name!
