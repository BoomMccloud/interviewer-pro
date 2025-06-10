#!/bin/bash

# Integration Test Runner Script
# This script helps run the real integration tests with proper setup

echo "🔧 Setting up Integration Test Environment..."

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ ERROR: GEMINI_API_KEY is not set!"
    echo "Please set your Gemini API key:"
    echo "export GEMINI_API_KEY='your-api-key-here'"
    exit 1
fi

echo "✅ GEMINI_API_KEY is set"

# Check if development server is running
echo "🌐 Checking if development server is running..."
if curl -s -f http://localhost:3000 > /dev/null; then
    echo "✅ Development server is running on http://localhost:3000"
else
    echo "⚠️  Development server is not running"
    echo "Please start it in another terminal with:"
    echo "npm run dev"
    echo ""
    read -p "Press Enter when the dev server is running..."
fi

# Check database connection
echo "💾 Checking database connection..."
npx prisma db push --accept-data-loss > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database is connected and schema is up to date"
else
    echo "❌ Database connection failed. Please check your DATABASE_URL"
    exit 1
fi

echo ""
echo "🚀 Running Real Integration Tests..."
echo "This will make actual AI API calls and may take up to 60 seconds per test"
echo ""

# Run the integration test
npx jest -c jest.config.backend.js tests/integration/real-interview-flow.integration.test.ts --verbose --forceExit

echo ""
echo "✅ Integration test completed!" 