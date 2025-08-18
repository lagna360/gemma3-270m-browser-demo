# SQL DDL Dummy Data Generator - Powered by Gemma 3 270M

A web-based SQL DDL dummy data generator that runs Google's Gemma 3 270M language model entirely in the browser using WebGPU acceleration.

## 🌟 Features

- **AI-Powered Data Generation**: Uses Gemma 3 270M to create realistic dummy data
- **Browser-Native**: Runs entirely in your browser with WebGPU acceleration  
- **SQL DDL Support**: Validates CREATE TABLE statements and generates appropriate data
- **Realistic Data**: Generates contextually appropriate data based on column names and types
- **Export Ready**: Download generated data as CSV files
- **No Server Required**: After setup, everything runs locally in your browser

## 📁 Project Structure

```
gemma3-270m/
├── 🌐 web/                  # Deployable web application
│   ├── index.html           # Main application
│   ├── script.js            # Application logic
│   ├── styles.css           # Styling
│   ├── gemma-loader.js      # Model loading utilities
│   └── models/              # Converted model files (after setup)
│       └── gemma-3-270m-onnx/
│           ├── onnx/        # ONNX model files
│           ├── tokenizer/   # Tokenizer files
│           ├── config.json  # Model configuration
│           └── manifest.json # Loading manifest
│
├── 🛠️  setup/               # Model conversion & setup tools
│   ├── README.md            # Detailed setup instructions
│   ├── convert_gemma.py     # Model conversion script
│   ├── requirements.txt     # Python dependencies
│   ├── setup.sh             # Automated setup script
│   ├── check_setup.py       # Setup verification
│   └── venv/                # Python virtual environment
│
├── 📚 Documentation
│   ├── README.md            # This file (overview & quick start)
│   └── CLAUDE.md            # Project development instructions
```

## 🚀 Quick Start

### Step 1: Initial Setup

The model needs to be downloaded and converted once before the web app can work.

```bash
# Navigate to setup directory
cd setup/

# Run automated setup (installs dependencies)
./setup.sh

# Get Hugging Face access (required for Gemma 3 270M)
huggingface-cli login
```

### Step 2: Convert Model

```bash
# Still in setup/ directory
python3 convert_gemma.py
```

This downloads google/gemma-3-270m (~270M parameters) and converts it to browser-compatible ONNX format (~540MB).

### Step 3: Run Web App

```bash
# Navigate to web directory and start local server
cd web/
python3 -m http.server 8000
```

### Step 4: Use the Application

1. Open **Chrome 113+** or **Edge 113+** (WebGPU required)
2. Navigate to: **http://localhost:8000**
3. Wait for Gemma 3 270M to load
4. Enter your CREATE TABLE statement
5. Generate realistic data with AI
6. Export as CSV

## 💡 Example Usage

Try this sample DDL:

```sql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    department VARCHAR(30),
    salary DECIMAL(10,2),
    hire_date DATE,
    age INTEGER
);
```

The AI will generate realistic data like:
- **first_name**: "Sarah", "Michael", "David"
- **email**: "sarah.johnson@company.com"  
- **department**: "Engineering", "Marketing"
- **salary**: 75000.00, 92500.00
- **hire_date**: 2023-01-15, 2022-11-03

## 🎯 Current Status

- ✅ **Web Application**: Ready for deployment
- ✅ **Model Conversion**: Automated scripts prepared
- ✅ **WebGPU Integration**: GPU acceleration enabled
- ⏳ **Model Files**: Need to be converted (see setup/ folder)

## ⚡ Technical Details

- **Model**: google/gemma-3-270m (270 million parameters)
- **Format**: ONNX with WebGPU optimization
- **Browser Requirements**: Chrome 113+, Edge 113+, Firefox Nightly
- **Performance**: Hardware-accelerated inference
- **Privacy**: Everything runs locally, no data sent to servers

## 🛠 Troubleshooting

### Model Not Found Error
The model hasn't been converted yet:
```bash
cd setup/
python3 convert_gemma.py
```

### WebGPU Not Supported
- Update to Chrome 113+ or Edge 113+
- Enable WebGPU in Firefox: `about:config` → `dom.webgpu.enabled`
- Safari not supported yet

### Access Denied Error  
1. Visit https://huggingface.co/google/gemma-3-270m
2. Request access and wait for approval
3. Run `huggingface-cli login`

## 📖 Detailed Setup

For comprehensive setup instructions, see **[setup/README.md](setup/README.md)**.

## 🤝 Deployment

The `web/` directory contains everything needed for deployment:
- Static HTML/CSS/JS files
- Converted model files (after setup)
- No server-side processing required
- Can be hosted on any static file server

## 🔗 References

- [Gemma 3 270M Model](https://huggingface.co/google/gemma-3-270m)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [Transformers.js Documentation](https://github.com/xenova/transformers.js)