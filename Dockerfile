FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install
COPY web/package.json web/package-lock.json ./
RUN npm ci

# Copy source and build
COPY web/ ./
RUN npm run build

# ── Production stage ──
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production server deps (pin express@4 for stable wildcard routing)
RUN npm init -y && npm install express@4 compression

# Copy built assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

# Railway injects PORT
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
