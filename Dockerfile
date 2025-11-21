# Stage 1: Build the React application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies with clean install for reproducible builds
RUN npm ci --only=production=false

# Copy source code and configuration files
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src

# Build the application
RUN npm run build

# Stage 2: Production server with Caddy
FROM caddy:2-alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy the built application from builder stage
COPY --from=builder /app/dist /srv/dist

# Copy Caddyfile configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Expose port 8080
EXPOSE 8080
