FROM node:22-bookworm-slim

# Install system build dependencies for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests first
COPY sabil-s-school-main/package*.json ./

# Cleanly install dependencies inside Linux environment
RUN npm install

# Copy application source code (node_modules is excluded via .dockerignore)
COPY sabil-s-school-main/ ./

# Ensure Linux bin executables have +x permissions
RUN chmod -R +x node_modules/.bin

# Build the React production bundle using Linux vite
RUN npm run build

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Run Express server
CMD ["node", "server/index.js"]
