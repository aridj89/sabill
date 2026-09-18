FROM node:22-bookworm-slim

# Install system build dependencies for better-sqlite3, node-hid, and USB libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libusb-1.0-0 \
    libusb-1.0-0-dev \
    libudev-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests first for efficient layer caching
COPY sabil-s-school-main/package*.json ./

# Install all dependencies including devDependencies (needed for Vite build)
RUN npm install --include=dev

# Copy application source code (node_modules is excluded via .dockerignore)
COPY sabil-s-school-main/ ./

# Ensure Linux bin executables have full execute permissions
RUN chmod -R +x node_modules/.bin

# Build the React production bundle
RUN npm run build

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Run Express server
CMD ["node", "server/index.js"]
