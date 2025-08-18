# Gemma 3 270M Browser Demo

A web-based SQL dummy data generator powered by **Google's Gemma 3 270M** language model running entirely in your browser with WebGPU acceleration.

## ✨ Features

- 🤖 **270M parameter AI model** running locally in your browser
- ⚡ **WebGPU acceleration** for fast inference
- 📊 **SQL DDL parsing** with realistic data generation
- 🔄 **Field-by-field generation** with contextual relationships
- 💾 **CSV export** functionality
- 🔒 **Complete privacy** - no data sent to servers

## 🚀 Quick Start

### Option 1: Direct Use (Recommended)

1. **Serve the web app:**
   ```bash
   cd web/
   python3 -m http.server 8000
   ```

2. **Open in browser:**
   - Navigate to http://localhost:8000
   - Requires Chrome 113+, Edge 113+, or Firefox Nightly
   - Model downloads automatically (~1.1GB, cached after first use)

3. **Generate data:**
   - Enter a CREATE TABLE statement
   - Click "Validate DDL" → "Generate with AI"
   - Watch Gemma 3 270M create realistic data field-by-field

### Option 2: Local Model Conversion (Advanced)

If you want to experiment with local model conversion:

```bash
cd setup/
./setup.sh
# Follow the authentication steps in setup/README.md
python3 convert_gemma.py
```

**Note:** The web app currently uses direct HuggingFace download for reliability. Converted models are saved in `setup/` for experimentation.

## 🧪 Example

```sql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    department TEXT,
    salary REAL,
    hire_date DATE
);
```

The AI generates contextually related data:
- `first_name: "John"` → `last_name: "Smith"` → `email: "john.smith@company.com"`
- `department: "Engineering"` → `salary: 95000` (higher for tech roles)

## 📁 Project Structure

```
├── web/              # Web application (46KB total)
│   ├── index.html    # Main app interface  
│   ├── script.js     # Core logic & field-by-field generation
│   ├── styles.css    # UI styling
│   └── gemma-loader.js # HuggingFace model loader
└── setup/            # Model conversion tools (optional)
    ├── convert_gemma.py # ONNX conversion script
    ├── setup.sh      # Automated setup
    └── README.md     # Detailed setup instructions
```

## 🛠️ Browser Requirements

- **Chrome 113+** (recommended)
- **Edge 113+** 
- **Firefox Nightly** (with WebGPU enabled)
- **Safari:** Not supported

## 🚀 Deployment

Deploy the `web/` folder to any static hosting:

```bash
# Example with Netlify
cd web/
npx netlify deploy --prod --dir .

# Example with Vercel  
cd web/
npx vercel --prod
```

**Requirements:**
- HTTPS required for WebGPU
- ~1.1GB bandwidth for first-time model download per user
- Models are cached by browser after download

## 🔧 How It Works

1. **WebGPU Detection:** Checks browser compatibility
2. **Model Loading:** Downloads Gemma 3 270M ONNX from HuggingFace
3. **SQL Parsing:** Validates DDL with SQL.js (SQLite in browser)
4. **AI Generation:** Creates data field-by-field with contextual prompts
5. **Data Assembly:** Combines outputs into structured CSV-exportable format

## 📄 License

This project demonstrates browser AI capabilities. Model usage follows [Gemma Terms of Use](https://ai.google.dev/gemma/terms).