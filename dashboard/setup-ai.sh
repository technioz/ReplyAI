#!/bin/bash

echo "🚀 Setting up AI Integration for Quirkly"
echo "========================================"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
    echo "⚠️  Please edit .env.local with your actual API keys"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🔧 Configuration Options:"
echo "1. For Groq (Default):"
echo "   AI_PROVIDER=groq"
echo "   GROQ_API_KEY=your_groq_api_key"
echo "   GROQ_MODEL=llama3-8b-8192"
echo ""
echo "2. For XAI (Grok 3):"
echo "   AI_PROVIDER=xai"
echo "   XAI_API_KEY=your_xai_api_key"
echo "   XAI_MODEL=grok-3"
echo ""
echo "📚 Documentation: See ../docs/AI_SETUP.md for detailed setup"
echo "🧪 Test: Run 'node test-ai-integration.js' to test your setup"
echo ""
echo "✨ Setup complete! Happy coding!"
