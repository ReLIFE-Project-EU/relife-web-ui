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

# Environment variables required for build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

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
