#!/usr/bin/env python3
"""
Gemma 3 270M to ONNX Converter for Browser Usage

This script downloads the google/gemma-3-270m model from Hugging Face
and converts it to ONNX format optimized for WebGPU execution in browsers.
"""

import os
import sys
import shutil
from pathlib import Path
import json
from typing import Optional

def check_dependencies():
    """Check if required packages are installed."""
    required_packages = [
        'transformers',
        'optimum[onnxruntime]',
        'torch',
        'huggingface_hub'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'optimum[onnxruntime]':
                import optimum.onnxruntime
            elif package == 'transformers':
                import transformers
            elif package == 'torch':
                import torch
            elif package == 'huggingface_hub':
                import huggingface_hub
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing required packages: {', '.join(missing_packages)}")
        print("Please install them with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ All required packages are installed")
    return True

def setup_directories():
    """Create necessary directories for the converted model."""
    model_dir = Path("../web/models/gemma-3-270m-onnx")
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (model_dir / "onnx").mkdir(exist_ok=True)
    (model_dir / "tokenizer").mkdir(exist_ok=True)
    
    print(f"✅ Created model directory: {model_dir}")
    return model_dir

def convert_model_to_onnx(model_dir: Path, use_auth_token: Optional[str] = None):
    """Convert Gemma 3 270M to ONNX format."""
    try:
        from optimum.onnxruntime import ORTModelForCausalLM
        from transformers import AutoTokenizer
        
        model_name = "google/gemma-3-270m"
        print(f"🔄 Starting conversion of {model_name}...")
        
        # Load and convert model
        print("📥 Downloading and converting model to ONNX...")
        ort_model = ORTModelForCausalLM.from_pretrained(
            model_name,
            export=True,
            use_auth_token=use_auth_token,
            provider="CPUExecutionProvider",  # Start with CPU, can optimize for WebGPU later
            use_cache=False,  # Disable KV cache for browser compatibility
        )
        
        # Load tokenizer
        print("📥 Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            use_auth_token=use_auth_token
        )
        
        # Save to our directory
        onnx_path = model_dir / "onnx"
        tokenizer_path = model_dir / "tokenizer"
        
        print(f"💾 Saving ONNX model to {onnx_path}...")
        ort_model.save_pretrained(onnx_path)
        
        print(f"💾 Saving tokenizer to {tokenizer_path}...")
        tokenizer.save_pretrained(tokenizer_path)
        
        # Create a config file for Transformers.js
        config = {
            "model_type": "gemma",
            "task": "text-generation",
            "onnx_file": "model.onnx",
            "tokenizer_file": "tokenizer.json",
            "architecture": "GemmaForCausalLM",
            "max_position_embeddings": 2048,
            "vocab_size": tokenizer.vocab_size,
            "conversion_date": "2024",
            "source": "google/gemma-3-270m",
            "quantized": False
        }
        
        with open(model_dir / "config.json", "w") as f:
            json.dump(config, f, indent=2)
        
        print("✅ Model conversion completed successfully!")
        print(f"📁 Model files saved in: {model_dir}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Please install required packages: pip install optimum[onnxruntime] transformers torch")
        return False
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        return False

def create_browser_manifest(model_dir: Path):
    """Create a manifest file for browser loading."""
    manifest = {
        "name": "Gemma 3 270M",
        "version": "1.0.0",
        "description": "Gemma 3 270M converted to ONNX for browser usage",
        "files": {
            "model": "onnx/model.onnx",
            "tokenizer": "tokenizer/tokenizer.json",
            "config": "config.json"
        },
        "requirements": {
            "webgpu": True,
            "memory_mb": 1024,
            "browser": ["chrome", "edge", "firefox-nightly"]
        },
        "usage": {
            "max_tokens": 2048,
            "temperature": 0.7,
            "top_p": 0.9
        }
    }
    
    with open(model_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    
    print("✅ Created browser manifest file")

def main():
    """Main conversion function."""
    print("🚀 Gemma 3 270M to ONNX Converter")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Setup directories
    model_dir = setup_directories()
    
    # Check for Hugging Face token
    auth_token = None
    if "HF_TOKEN" in os.environ:
        auth_token = os.environ["HF_TOKEN"]
        print("✅ Using Hugging Face token from environment")
    else:
        print("⚠️  No HF_TOKEN found. You may need to authenticate:")
        print("   huggingface-cli login")
        print("   or set HF_TOKEN environment variable")
    
    # Convert model
    success = convert_model_to_onnx(model_dir, auth_token)
    
    if success:
        # Create browser manifest
        create_browser_manifest(model_dir)
        
        print("\n🎉 Conversion completed successfully!")
        print("\nNext steps:")
        print("1. Start a local server to serve the model files")
        print("2. Update your HTML to load the converted model")
        print("3. Test the model in a WebGPU-enabled browser")
        print(f"\nModel location: {model_dir.absolute()}")
        
        # Print model info
        model_size = sum(f.stat().st_size for f in model_dir.rglob('*') if f.is_file())
        print(f"Total model size: {model_size / (1024*1024):.1f} MB")
        
    else:
        print("\n❌ Conversion failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()