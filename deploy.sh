#!/bin/bash

# Deployment script for NuurPath Travels application

echo "🚀 Starting deployment of NuurPath Travels..."

# Check if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Docker detected! Using Docker deployment..."

    # Step 1: Build Docker images
    echo "🔨 Building Docker images..."
    docker-compose build

    # Step 2: Start containers
    echo "🚀 Starting containers..."
    docker-compose up -d

    echo "✅ Docker deployment complete!"
    echo "📊 Application will be available at http://localhost:5001"
    echo "� PostgreSQL will be available at http://localhost:5432"
else
    echo "📦 Docker not found. Using traditional deployment..."

    # Step 1: Install backend dependencies
    echo "📦 Installing backend dependencies..."
    cd backend || exit
    npm install
    cd ..

    # Step 2: Install frontend dependencies
    echo "📦 Installing frontend dependencies..."
    cd client || exit
    npm install
    cd ..

    # Step 3: Build frontend for production
    echo "🔨 Building frontend for production..."
    cd client || exit
    npm run build
    cd ..

    # Step 4: Set up environment variables
    echo "🔧 Setting up environment variables..."
    if [ ! -f "backend/.env" ]; then
        echo "Creating backend .env file..."
        cat > backend/.env << EOF
PORT=5001
DATABASE_URL=postgresql://user:password@localhost:5432/nuurpath_travels
JWT_SECRET=Nuurpath2025
NODE_ENV=production
EOF
    fi

    # Step 5: Start the application
    echo "🚀 Starting NuurPath Travels application..."
    echo "Application will be available at http://localhost:5001"
    echo "Frontend will be served by backend in production mode"

    # Start the backend server (which will serve the frontend in production)
    cd backend || exit
    node server.js

    echo "✅ Deployment complete!"
fi
