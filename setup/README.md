# Setup Guide - Gemma 3 270M Local Conversion (Optional)

This directory contains tools to experiment with local model conversion. 

**⚠️ Important:** The web app now uses direct HuggingFace download and doesn't require local conversion. This setup is **optional** for experimentation only.

## 📋 What This Does

The conversion process:
1. **Downloads** Gemma 3 270M model from HuggingFace
2. **Converts** to ONNX format for browser compatibility
3. **Saves** converted files to `setup/models/` (not used by web app)
4. **Creates** experimental files you can test locally

## 🚀 Quick Setup (Optional)

### 1. Automated Setup
```bash
cd setup/
./setup.sh
```

### 2. Get HuggingFace Access
1. Visit https://huggingface.co/settings/tokens
2. Create a "Read" access token
3. Visit https://huggingface.co/google/gemma-3-270m and request access
4. Wait for approval (usually minutes to hours)
5. Authenticate:
   ```bash
   hf auth login --token YOUR_TOKEN_HERE
   ```

### 3. Convert Model
```bash
python3 convert_gemma.py
```

This creates `setup/models/gemma-3-270m-onnx/` with converted files.

## 🧪 Testing Converted Files (Advanced)

To test your converted model in the web app:

1. **Copy converted files to web directory:**
   ```bash
   cp -r models/gemma-3-270m-onnx ../web/
   ```

2. **Modify web/gemma-loader.js:**
   ```javascript
   // Change this line:
   this.modelPath = 'onnx-community/gemma-3-270m-it-ONNX';
   
   // To this:
   this.modelPath = './gemma-3-270m-onnx';
   
   // And enable local models:
   env.allowLocalModels = true;
   ```

3. **Test the web app** - it will use your local conversion instead of downloading

## 📁 Output Structure

After conversion, you'll have:
```
setup/
└── models/
    └── gemma-3-270m-onnx/
        ├── config.json
        ├── onnx/
        │   ├── model.onnx
        │   └── model.onnx_data
        └── tokenizer/
            ├── tokenizer.json
            └── tokenizer_config.json
```

## 🔧 Files Explained

- **`convert_gemma.py`** - Downloads and converts Gemma 3 270M
- **`setup.sh`** - Creates Python environment and installs dependencies  
- **`check_setup.py`** - Verifies setup completion
- **`requirements.txt`** - Python package dependencies

## ❓ Why Convert Locally?

**You don't need to!** The web app works great with HuggingFace download. Local conversion is useful for:
- **Learning** how the conversion process works
- **Experimenting** with model modifications
- **Offline usage** after initial download
- **Custom model variants**

## 🆘 Troubleshooting

### Access Denied
- Request access to https://huggingface.co/google/gemma-3-270m
- Wait for approval email
- Run `hf auth login` with a valid token

### Conversion Errors
- Ensure Python 3.8+ is installed
- Verify all dependencies: `pip install -r requirements.txt`
- Check available disk space (~2GB needed)

### ONNX Architecture Issues
The script uses pre-converted `onnx-community/gemma-3-270m-it-ONNX` to avoid Gemma 3 architecture compatibility issues.

---

**Remember:** This setup is completely optional. The web app works perfectly without any local conversion!