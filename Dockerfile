# FilterFox Development Environment
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    bash \
    curl \
    zip \
    unzip \
    python3 \
    make \
    g++ \
    chromium \
    firefox

# Set working directory
WORKDIR /workspace

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S filterfox -u 1001 -G nodejs

# Install global npm packages
RUN npm install -g \
    web-ext \
    eslint \
    prettier \
    jest

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY --chown=filterfox:nodejs . .

# Set permissions
RUN chown -R filterfox:nodejs /workspace

# Switch to non-root user
USER filterfox

# Expose ports for development server
EXPOSE 3000 8080 9000

# Environment variables
ENV NODE_ENV=development
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV FIREFOX_BIN=/usr/bin/firefox

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Default command
CMD ["npm", "run", "dev"]