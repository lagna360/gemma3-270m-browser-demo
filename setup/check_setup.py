#!/usr/bin/env python3
"""
Setup verification script for Gemma 3 270M browser project
"""

import os
import sys
from pathlib import Path

def check_files():
    """Check if all required files are present."""
    print("🔍 Checking project files...")
    
    required_files = [
        "index.html",
        "script.js", 
        "styles.css",
        "gemma-loader.js",
        "convert_gemma.py",
        "requirements.txt",
        "CLAUDE.md"
    ]
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
        else:
            print(f"✅ {file}")
    
    if missing_files:
        print(f"❌ Missing files: {', '.join(missing_files)}")
        return False
    
    print("✅ All required files present")
    return True

def check_python_deps():
    """Check if Python dependencies can be imported."""
    print("\n🔍 Checking Python dependencies...")
    
    deps = [
        "transformers",
        "optimum", 
        "torch",
        "huggingface_hub",
        "onnx",
        "onnxruntime"
    ]
    
    missing_deps = []
    for dep in deps:
        try:
            if dep == "optimum":
                import optimum.onnxruntime
            else:
                __import__(dep)
            print(f"✅ {dep}")
        except ImportError:
            missing_deps.append(dep)
            print(f"❌ {dep}")
    
    if missing_deps:
        print(f"\n⚠️  Missing dependencies: {', '.join(missing_deps)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    print("✅ All Python dependencies available")
    return True

def check_model_conversion():
    """Check if model has been converted."""
    print("\n🔍 Checking model conversion status...")
    
    model_dir = Path("models/gemma-3-270m-onnx")
    
    if not model_dir.exists():
        print("❌ Model directory not found")
        print("Run: python3 convert_gemma.py")
        return False
    
    required_model_files = [
        "onnx/model.onnx",
        "tokenizer/tokenizer.json", 
        "config.json",
        "manifest.json"
    ]
    
    missing_model_files = []
    for file in required_model_files:
        model_file = model_dir / file
        if not model_file.exists():
            missing_model_files.append(file)
        else:
            size = model_file.stat().st_size
            print(f"✅ {file} ({size / (1024*1024):.1f} MB)")
    
    if missing_model_files:
        print(f"❌ Model not converted. Missing: {', '.join(missing_model_files)}")
        print("Run: python3 convert_gemma.py")
        return False
    
    print("✅ Model converted and ready")
    return True

def check_hf_auth():
    """Check Hugging Face authentication."""
    print("\n🔍 Checking Hugging Face authentication...")
    
    try:
        from huggingface_hub import whoami
        user_info = whoami()
        print(f"✅ Authenticated as: {user_info['name']}")
        return True
    except Exception as e:
        print(f"❌ Not authenticated: {e}")
        print("Run: huggingface-cli login")
        return False

def main():
    """Run all checks."""
    print("🚀 Gemma 3 270M Project Setup Verification")
    print("=" * 50)
    
    checks = [
        check_files(),
        check_python_deps(),
        check_hf_auth(),
        check_model_conversion()
    ]
    
    print("\n" + "=" * 50)
    
    if all(checks):
        print("🎉 Setup complete! Ready to run the application.")
        print("\nNext steps:")
        print("1. python3 -m http.server 8000")
        print("2. Open http://localhost:8000 in Chrome 113+")
    else:
        print("⚠️  Setup incomplete. Please address the issues above.")
        
        if not checks[1]:  # Python deps
            print("\nTo install dependencies:")
            print("pip install -r requirements.txt")
            
        if not checks[2]:  # HF auth
            print("\nTo authenticate with Hugging Face:")
            print("huggingface-cli login")
            
        if not checks[3]:  # Model conversion
            print("\nTo convert the model:")
            print("python3 convert_gemma.py")

if __name__ == "__main__":
    main()