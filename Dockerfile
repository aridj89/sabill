FROM node:20-bookworm-slim

# Install system dependencies for compiling better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and install
COPY sabil-s-school-main/package*.json ./
RUN npm install

# Copy application source code
COPY sabil-s-school-main/ ./

# Build React frontend
RUN npm run build

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Run Express server
CMD ["node", "server/index.js"]
