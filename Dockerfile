# Dockerfile for NuurPath Travels Application

# Stage 1: Build frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ .

# Build the frontend
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine as backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
RUN npm install

# Copy backend source
COPY backend/ .

# Stage 3: Final image
FROM node:18-alpine

WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy backend source
COPY --from=backend-builder /app/backend .

# Copy environment files
COPY backend/.env .

# Install production dependencies
RUN npm install --production

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
