# Dockerfile for NuurPath Travels Application

# Stage 1: Build frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/client

# Copy package files
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY client/ .

# Build the frontend
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine as backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend source
COPY backend/ .

# Stage 3: Final image
FROM node:18-alpine

WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/client/build ./client/build

# Copy backend source
COPY --from=backend-builder /app/backend ./backend

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 5001

# Start the application
CMD ["node", "server.js"]
