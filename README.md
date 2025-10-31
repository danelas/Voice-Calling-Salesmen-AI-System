# Voice Sales AI - Intelligent Voice Calling Salesmen

An AI-powered voice calling system that uses advanced AI to conduct sales calls, track performance, and continuously improve.

## Features

- **AI Voice Synthesis**: ElevenLabs integration for natural-sounding voice
- **Intelligent Conversations**: OpenAI GPT for dynamic sales conversations
- **Call Management**: TextMagic for phone call capabilities
- **Analytics Dashboard**: Track call performance and success metrics
- **Continuous Learning**: AI learns from successful calls to improve performance
- **Database Tracking**: Complete call history and analytics storage

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **AI Voice**: ElevenLabs Text-to-Speech
- **AI Conversation**: OpenAI GPT-4
- **Calling**: TextMagic API
- **Frontend**: React with TailwindCSS
- **Deployment**: Render

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations: `npx prisma migrate dev`
5. Start the development server: `npm run dev`

## Environment Variables

```
DATABASE_URL=your_postgresql_url
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
TEXTMAGIC_USERNAME=your_textmagic_username
TEXTMAGIC_API_KEY=your_textmagic_key
```

## API Endpoints

- `POST /api/calls/initiate` - Start a new sales call
- `GET /api/calls` - Get call history
- `GET /api/analytics` - Get performance analytics
- `POST /api/leads` - Add new leads
- `GET /api/dashboard` - Dashboard data

## Deployment

The application is configured for deployment on Render with automatic builds from the main branch.
