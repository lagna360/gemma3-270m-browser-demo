# Setup Guide - Gemma 3 270M Conversion

This directory contains all the tools needed to download and convert Google's Gemma 3 270M model for browser usage. This is a **one-time setup process** that prepares the model for the web application.

## 📋 Overview

The setup process:
1. **Downloads** google/gemma-3-270m from Hugging Face
2. **Converts** PyTorch model to ONNX format  
3. **Optimizes** for WebGPU browser execution
4. **Saves** converted files to `../web/models/`

## 🛠 Files in This Directory

- **`convert_gemma.py`** - Main conversion script
- **`requirements.txt`** - Python dependencies
- **`setup.sh`** - Automated environment setup
- **`check_setup.py`** - Verification script
- **`venv/`** - Python virtual environment (after setup)

## 🚀 Quick Setup

### 1. Run Automated Setup

```bash
# Make sure you're in the setup/ directory
cd setup/

# Run the setup script (installs Python dependencies)
./setup.sh
```

This creates a virtual environment and installs all required packages.

### 2. Authenticate with Hugging Face

```bash
# Login with your Hugging Face account
huggingface-cli login
```

**Important**: You need access to google/gemma-3-270m. If you haven't requested access:
1. Visit: https://huggingface.co/google/gemma-3-270m  
2. Click "Request Access"
3. Wait for approval (usually quick for research use)

### 3. Convert the Model

```bash
# Run the conversion (takes 5-15 minutes)
python3 convert_gemma.py
```

This will:
- Download Gemma 3 270M (~540MB)
- Convert to ONNX format
- Optimize for WebGPU
- Save to `../web/models/gemma-3-270m-onnx/`

### 4. Verify Setup

```bash
# Check if everything worked
python3 check_setup.py
```

## 📥 Manual Setup (Alternative)

If the automated setup doesn't work:

### Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install packages
pip install --upgrade pip
pip install transformers "optimum[onnxruntime]" torch huggingface_hub accelerate onnx onnxruntime numpy tokenizers safetensors
```

### Run Conversion

```bash
# Activate environment
source venv/bin/activate

# Convert model
python3 convert_gemma.py
```

## 🔍 What Gets Created

After successful conversion, you'll have:

```
../web/models/gemma-3-270m-onnx/
├── onnx/
│   ├── model.onnx          # Main ONNX model (~400MB)
│   └── model_data.bin      # Model weights  
├── tokenizer/
│   ├── tokenizer.json      # Tokenizer configuration
│   └── vocab.txt           # Vocabulary file
├── config.json             # Model configuration
└── manifest.json           # Browser loading manifest
```

**Total size**: ~540MB

## ⚡ Performance Notes

### Conversion Requirements
- **RAM**: 4GB+ recommended  
- **Storage**: 2GB free space (temporary files)
- **Time**: 5-15 minutes depending on connection
- **Internet**: Required for initial download

### Browser Performance  
- **Chrome 113+**: Best performance
- **Edge 113+**: Good performance  
- **Firefox Nightly**: Experimental (enable WebGPU flag)
- **Safari**: Not supported

## 🛠 Troubleshooting

### Permission Denied Error
```
Make sure you have access to it at https://huggingface.co/google/gemma-3-270m
```
**Solution**: Request access at the Hugging Face model page, then `huggingface-cli login`

### Out of Memory Error
```
RuntimeError: CUDA out of memory
```
**Solution**: The conversion uses CPU by default. If you see CUDA errors, restart and try again.

### Missing Dependencies
```
ImportError: No module named 'optimum'
```
**Solution**: 
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Download Interrupted
If the download gets interrupted, delete the partial files and restart:
```bash
rm -rf ../web/models/gemma-3-270m-onnx/
python3 convert_gemma.py
```

## 🔄 Re-running Conversion

To convert again (if needed):

```bash
# Remove existing files
rm -rf ../web/models/gemma-3-270m-onnx/

# Re-run conversion
python3 convert_gemma.py
```

## 📊 Verification Checklist

Run `python3 check_setup.py` to verify:

- ✅ Python dependencies installed
- ✅ Hugging Face authentication  
- ✅ Model files created
- ✅ File sizes correct
- ✅ Web app ready to run

## 🚀 Next Steps

After successful setup:

1. **Navigate to web directory**:
   ```bash
   cd ../web/
   ```

2. **Start the application**:
   ```bash
   python3 -m http.server 8000
   ```

3. **Open in browser**:
   http://localhost:8000

## 🔧 Advanced Configuration

### Custom Model Path
Edit `convert_gemma.py` line 51 to change the output directory:
```python
model_dir = Path("../web/models/gemma-3-270m-onnx")
```

### Quantization Options
The script uses INT8 quantization by default for browser efficiency. To modify:
```python
# In convert_gemma.py, modify the ORTModelForCausalLM.from_pretrained call
# Add quantization parameters as needed
```

### WebGPU Optimization
The ONNX model is optimized for WebGPU by default. Browser performance depends on:
- GPU hardware capabilities
- Available VRAM  
- Browser WebGPU implementation

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Try the manual setup process
4. Ensure you have the latest browser versions

The converted model will be used by the web application in `../web/`.