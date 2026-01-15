#!/bin/bash

# Claudia - Clean Start Script
# Kills existing processes and restarts on proper ports

set -e

# ============================================
# PORT CONFIGURATION - Single source of truth
# ============================================
BACKEND_PORT=4001
FRONTEND_PORT=5173
OPENCODE_PORT=4097
# ============================================

# Ensure OpenCode CLI is in PATH
export PATH=$HOME/.opencode/bin:$PATH

# SAP AI Core Configuration
export AICORE_SERVICE_KEY='{
  "clientid": "sb-22bfecdf-f974-4d09-894e-09290754c62e!b197058|xsuaa_std!b77089",
  "clientsecret": "3e6abeba-541b-40dd-bde1-22932711bdc7$epbNN44FfUyNNPvX5BLEjWOfy3wYekN2GrZMwiixPUU=",
  "url": "https://auth-test-eozx9vb7.authentication.sap.hana.ondemand.com",
  "serviceurls": {
    "AI_API_URL": "https://api.ai.internalprod.eu-central-1.aws.ml.hana.ondemand.com"
  }
}'
export AICORE_RESOURCE_GROUP='default'

echo "🧹 Cleaning up existing processes..."

# Kill processes on our ports
for port in $BACKEND_PORT $FRONTEND_PORT $OPENCODE_PORT; do
    pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "   Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
done

# Kill any lingering node/tsx processes related to this project
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "vite.*codeui" 2>/dev/null || true
pkill -f "node.*backend/src/index.ts" 2>/dev/null || true
pkill -f "node.*test-cli.ts" 2>/dev/null || true
# Explicitly kill opencode processes (zombies from SDK)
pkill -f "opencode" 2>/dev/null || true
pkill -f "opencode-studio-server" 2>/dev/null || true
# Kill any node process running in this project directory (aggressive fallback)
pgrep -f "node" | xargs -I {} sh -c 'lsof -p {} | grep "'$(pwd)'" >/dev/null && kill -9 {}' 2>/dev/null || true

# Wait for ports to be freed
sleep 1

# Verify ports are free
for port in $BACKEND_PORT $FRONTEND_PORT $OPENCODE_PORT; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "❌ Port $port is still in use. Please kill manually:"
        lsof -i:$port
        exit 1
    fi
done

echo "✅ Ports are free"
echo ""
echo "🔮 Starting Claudia..."
echo "   Backend: http://localhost:$BACKEND_PORT (auto-reloads on file changes)"
echo "   Frontend: http://localhost:$FRONTEND_PORT (auto-reloads on file changes)"
echo ""
echo "💡 Multi-Instance Development:"
echo "   - Backend uses tsx watch (auto-reloads on save)"
echo "   - Frontend uses Vite HMR (instant updates)"
echo "   - Multiple Claude Code instances can work simultaneously"
echo "   - No manual restarts needed!"
echo ""

# Start from project root
cd "$(dirname "$0")"

# Export PORT for the backend to use
export PORT=$BACKEND_PORT

# Start backend and frontend
# Backend: tsx watch auto-reloads on .ts file changes
# Frontend: Vite HMR auto-reloads on file changes
npm run dev

