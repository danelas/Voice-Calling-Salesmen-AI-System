# Use Node.js 18 LTS (slim version for better compatibility)
FROM node:18-slim

# Install system dependencies needed for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with verbose logging
RUN npm ci --verbose

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Install client dependencies and build React app
RUN cd client && npm ci && npm run build

# Create necessary directories with proper permissions
RUN mkdir -p audio temp logs && \
    chmod 755 audio temp logs

# Expose port
EXPOSE 10000

# Simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:10000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
