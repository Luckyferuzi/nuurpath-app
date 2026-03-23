#!/bin/bash

# Navigate to script directory
cd "$(dirname "$0")"

echo "🔄 Checking for PostgreSQL service..."

# 1. Check Docker (if docker-compose.yml exists in parent)
if [ -f "../docker-compose.yml" ] && command -v docker &> /dev/null; then
    # Check if postgres service is known to docker-compose
    if docker-compose ps -q postgres &> /dev/null; then
        echo "🐳 Found Docker PostgreSQL service. Restarting..."
        cd ..
        docker-compose restart postgres
        echo "✅ Docker container restarted."
        exit 0
    fi
fi

# 2. Check Homebrew (macOS)
if command -v brew &> /dev/null; then
    # Check if postgresql is in brew services
    if brew services list | grep -q "postgresql"; then
        echo "🍺 Found Homebrew PostgreSQL service. Restarting..."
        # Extract service name (e.g., postgresql@14 or just postgresql)
        PG_SERVICE=$(brew services list | grep "postgresql" | awk '{print $1}' | head -n 1)
        brew services restart $PG_SERVICE
        echo "✅ Homebrew service restarted."
        exit 0
    fi
fi

# 3. Fallback / Manual Instructions
echo "⚠️  Could not automatically detect a running PostgreSQL service manager."
echo ""
echo "👉 Manual Restart Instructions:"
echo "   • Homebrew:  brew services restart postgresql"
echo "   • Docker:    docker-compose restart postgres"
echo "   • Mac App:   Open Postgres.app and click 'Restart'"
echo "   • System:    pg_ctl -D /usr/local/var/postgres restart"