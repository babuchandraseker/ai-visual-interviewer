# Multi-Stage Dockerfile for AI Visual Interviewer Server

# Stage 1: Build Environment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy server package definitions
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/

# Install server dependencies
WORKDIR /app/server
RUN npm ci

# Copy server source code and compile TypeScript
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=4000

# Create non-root system user
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copy package definitions and install production dependencies only
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci --only=production

# Copy compiled TypeScript output from builder stage
COPY --from=builder /app/server/dist ./dist

# Set process ownership
USER nodeuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
