#!/bin/bash

# Setup script for Gemma 3 270M browser conversion
# This script installs dependencies and runs the conversion

echo "🚀 Setting up Gemma 3 270M for browser usage"
echo "============================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "1. Log in to Hugging Face (if you haven't already):"
echo "   huggingface-cli login"
echo ""
echo "2. Run the conversion script:"
echo "   python3 convert_gemma.py"
echo ""
echo "3. Start a local server to test:"
echo "   cd ../web && python3 -m http.server 8000"
echo ""
echo "Note: Make sure you have access to google/gemma-3-270m on Hugging Face"