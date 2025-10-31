# Voice Sales AI - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- API keys for:
  - OpenAI (GPT-4 access)
  - ElevenLabs (Text-to-Speech)
  - TextMagic (SMS/Calling)

## Quick Start

### 1. Clone and Install Dependencies

```bash
cd C:\Users\dandu\CascadeProjects\voice-sales-ai
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required environment variables:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/voice_sales_ai"
OPENAI_API_KEY="sk-your-openai-key-here"
ELEVENLABS_API_KEY="your-elevenlabs-key-here"
ELEVENLABS_VOICE_ID="your-preferred-voice-id"
TEXTMAGIC_USERNAME="your-textmagic-username"
TEXTMAGIC_API_KEY="your-textmagic-api-key"
JWT_SECRET="your-jwt-secret-here"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Install Frontend Dependencies

```bash
cd client
npm install
```

### 5. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start separately:
# Backend only: npm run server
# Frontend only: npm run client
```

## API Keys Setup

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Ensure you have GPT-4 access
4. Add to `.env` as `OPENAI_API_KEY`

### ElevenLabs API Key
1. Go to https://elevenlabs.io/
2. Sign up/login and go to Profile → API Keys
3. Generate a new API key
4. Choose a voice ID from their voice library
5. Add both to `.env`

### TextMagic API Key
1. Go to https://www.textmagic.com/
2. Sign up and go to API settings
3. Get your username and API key
4. Add to `.env`

**Note:** TextMagic is primarily for SMS. For actual voice calling, consider integrating Twilio Voice API.

## Database Schema

The system uses PostgreSQL with the following main tables:

- **leads** - Customer lead information
- **calls** - Call records and metadata
- **interactions** - Individual conversation exchanges
- **call_analytics** - Detailed call performance metrics
- **sales_scripts** - AI conversation templates
- **system_settings** - Configuration settings

## API Endpoints

### Leads Management
- `POST /api/leads` - Create new lead
- `GET /api/leads` - List leads with filtering
- `GET /api/leads/:id` - Get lead details
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `POST /api/leads/bulk` - Bulk import leads

### Call Management
- `POST /api/calls/initiate` - Start new call
- `POST /api/calls/:id/start` - Begin active call
- `POST /api/calls/:id/interact` - Process conversation
- `POST /api/calls/:id/end` - End call and analyze
- `GET /api/calls` - List calls with filtering
- `GET /api/calls/:id` - Get call details

### Analytics
- `GET /api/analytics/overview` - General analytics
- `GET /api/analytics/performance` - Performance metrics
- `GET /api/analytics/trends` - Trend analysis
- `GET /api/analytics/improvements` - AI suggestions

### Dashboard
- `GET /api/dashboard` - Complete dashboard data
- `GET /api/dashboard/quick-stats` - Quick statistics
- `GET /api/dashboard/alerts` - System alerts

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express API    │    │   PostgreSQL    │
│   (Dashboard)   │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  AI Services    │
                    │                 │
                    │ • OpenAI GPT-4  │
                    │ • ElevenLabs    │
                    │ • TextMagic     │
                    └─────────────────┘
```

## Key Features

### 🤖 AI-Powered Conversations
- Dynamic conversation generation using OpenAI GPT-4
- Context-aware responses based on lead information
- Intelligent objection handling
- Personalized sales scripts

### 🎙️ Natural Voice Synthesis
- High-quality voice generation with ElevenLabs
- Multiple voice options and emotions
- Real-time audio generation
- Conversation-appropriate tone adjustment

### 📊 Advanced Analytics
- Real-time call performance tracking
- Sentiment analysis and engagement scoring
- Conversion probability prediction
- AI-generated improvement suggestions

### 📱 Communication Integration
- SMS follow-up automation
- Call scheduling and reminders
- Multi-channel lead nurturing

### 📈 Performance Optimization
- Continuous learning from successful calls
- A/B testing of different approaches
- Industry-specific script optimization
- Real-time performance monitoring

## Development Workflow

### Adding New Features

1. **Database Changes**
   ```bash
   # Modify prisma/schema.prisma
   npx prisma migrate dev --name feature_name
   npx prisma generate
   ```

2. **API Development**
   - Add routes in `routes/` directory
   - Add validation in `middleware/validation.js`
   - Add business logic in `services/` or `utils/`

3. **Frontend Development**
   - Add components in `client/src/components/`
   - Add pages in `client/src/pages/`
   - Update API calls in `client/src/services/`

### Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client && npm test

# Run integration tests
npm run test:integration
```

## Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Use the provided `render.yaml` configuration
3. Set environment variables in Render dashboard
4. Deploy automatically on git push

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure database exists

2. **API Key Issues**
   - Verify all API keys are valid
   - Check API key permissions
   - Ensure sufficient credits/quota

3. **Audio Generation Issues**
   - Check ElevenLabs API key and voice ID
   - Verify audio directory permissions
   - Monitor API rate limits

4. **Call Failures**
   - Check TextMagic configuration
   - Verify phone number formats
   - Monitor service status

### Logs and Monitoring

```bash
# View application logs
npm run logs

# Monitor database queries
npx prisma studio

# Check API health
curl http://localhost:3001/api/health
```

## Performance Optimization

### Database Optimization
- Index frequently queried fields
- Use connection pooling
- Implement query optimization

### API Optimization
- Implement caching for static data
- Use pagination for large datasets
- Optimize AI service calls

### Frontend Optimization
- Implement lazy loading
- Use React.memo for expensive components
- Optimize bundle size

## Security Considerations

- API keys stored securely in environment variables
- Input validation and sanitization
- Rate limiting on API endpoints
- HTTPS in production
- Database query parameterization

## Support and Maintenance

### Regular Tasks
- Monitor API usage and costs
- Review and update AI prompts
- Analyze call performance metrics
- Update dependencies regularly

### Scaling Considerations
- Database connection pooling
- Load balancing for multiple instances
- CDN for static assets
- Microservices architecture for high volume

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
