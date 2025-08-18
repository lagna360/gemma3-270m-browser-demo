// Global variables
let SQL;
let db;
let generator = null;
let isGenerating = false;
let stopGeneration = false;
let currentTable = null;
let tableColumns = [];
let generatedData = [];
let currentPage = 1;
const rowsPerPage = 20;
let webGPUSupported = false;

// Check WebGPU support
async function checkWebGPU() {
    const modelStatus = document.getElementById('modelStatus');
    const statusIndicator = document.getElementById('statusIndicator');
    const webgpuStatus = document.getElementById('webgpuStatus');
    
    if ('gpu' in navigator) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                webGPUSupported = true;
                webgpuStatus.textContent = '✅ WebGPU is supported!';
                webgpuStatus.className = 'webgpu-status supported';
                modelStatus.textContent = 'WebGPU Ready';
                return true;
            }
        } catch (e) {
            console.error('WebGPU check error:', e);
        }
    }
    
    webgpuStatus.textContent = '❌ WebGPU is not supported in this browser';
    webgpuStatus.className = 'webgpu-status unsupported';
    modelStatus.textContent = 'WebGPU Not Available';
    document.getElementById('compatibilityWarning').style.display = 'block';
    return false;
}

// Initialize SQL.js
async function initSQL() {
    try {
        const sqlPromise = window.initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        SQL = await sqlPromise;
        db = new SQL.Database();
        console.log('SQL.js initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize SQL.js:', error);
        showMessage('error', '❌ Failed to initialize SQL engine. Please refresh the page.');
        return false;
    }
}

// Initialize the AI model (Gemma 3 270M via local ONNX)
async function initModel() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const modelStatus = document.getElementById('modelStatus');
    const statusIndicator = document.getElementById('statusIndicator');
    
    if (!webGPUSupported) {
        loadingOverlay.classList.remove('show');
        showMessage('warning', '⚠️ WebGPU not supported. Please use Chrome 113+ or Edge 113+ for AI features.');
        return false;
    }
    
    try {
        loadingMessage.textContent = 'Initializing Gemma 3 270M loader...';
        
        // Check if GemmaLoader is available
        if (typeof GemmaLoader === 'undefined') {
            throw new Error('GemmaLoader not found. Make sure gemma-loader.js is included.');
        }
        
        // Create Gemma loader instance
        const gemmaLoader = new GemmaLoader();
        
        loadingMessage.textContent = 'Loading converted Gemma 3 270M model...';
        
        // Load the converted model
        await gemmaLoader.loadModel((progress) => {
            loadingMessage.textContent = progress.message;
            if (progress.percent) {
                loadingMessage.textContent += ` (${progress.percent}%)`;
            }
        });
        
        // Wrap the gemmaLoader to match the expected generator interface
        generator = {
            generate: async (prompt, options = {}) => {
                const result = await gemmaLoader.generate(prompt, options);
                return result; // gemmaLoader.generate already returns the right format
            },
            isLoaded: () => gemmaLoader.isLoaded,
            getInfo: () => gemmaLoader.getModelInfo()
        };
        
        modelStatus.textContent = 'Gemma 3 270M Ready';
        statusIndicator.classList.add('ready');
        showMessage('success', '✅ Gemma 3 270M loaded! Ready to generate realistic data.');
        return true;
        
    } catch (error) {
        console.error('Error loading model:', error);
        modelStatus.textContent = 'Model Load Failed';
        showMessage('error', '❌ Failed to load Gemma 3 270M. Please check your connection and browser compatibility.');
        return false;
    } finally {
        loadingOverlay.classList.remove('show');
    }
}

// Validate DDL
function validateDDL() {
    if (!db) {
        showMessage('error', 'SQL engine not initialized. Please refresh the page.');
        return false;
    }

    const ddl = document.getElementById('ddlInput').value.trim();
    
    if (!ddl) {
        showMessage('error', 'Please enter a CREATE TABLE statement.');
        return false;
    }

    try {
        // Create a temporary database to test the DDL
        const testDb = new SQL.Database();
        testDb.run(ddl);
        
        // Extract table name
        const tableMatch = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
        if (!tableMatch) {
            showMessage('error', 'Could not extract table name from DDL.');
            return false;
        }
        
        currentTable = tableMatch[1];
        
        // Get table info
        const result = testDb.exec(`PRAGMA table_info(${currentTable})`);
        if (result.length > 0) {
            tableColumns = result[0].values.map(row => ({
                name: row[1],
                type: row[2],
                notNull: row[3] === 1,
                defaultValue: row[4],
                isPrimaryKey: row[5] === 1
            }));
            
            displaySchema();
        }
        
        testDb.close();
        
        // Create the actual table in our main database
        db.run(`DROP TABLE IF EXISTS ${currentTable}`);
        db.run(ddl);
        
        showMessage('success', `✅ DDL validated! Table "${currentTable}" is ready for AI data generation.`);
        document.getElementById('generateBtn').disabled = !generator;
        
        if (!generator) {
            showMessage('warning', '⚠️ AI model not loaded. Please use a WebGPU-enabled browser.');
        }
        
        return true;
        
    } catch (error) {
        showMessage('error', `❌ DDL Validation Error: ${error.message}`);
        document.getElementById('generateBtn').disabled = true;
        return false;
    }
}

// Display schema
function displaySchema() {
    const schemaDisplay = document.getElementById('schemaDisplay');
    const schemaContent = document.getElementById('schemaContent');
    
    schemaContent.innerHTML = tableColumns.map(col => `
        <div class="column-item">
            <strong>${col.name}</strong> - ${col.type}
            ${col.isPrimaryKey ? '🔑' : ''}
            ${col.notNull ? '(NOT NULL)' : ''}
        </div>
    `).join('');
    
    schemaDisplay.style.display = 'block';
}

// Generate data using AI model (with fallback to realistic mock data)
async function generateDataRow(rowIndex) {
    const values = {};
    const promptDisplay = document.getElementById('promptDisplay');
    
    for (const col of tableColumns) {
        if (col.isPrimaryKey && col.type.includes('INT')) {
            values[col.name] = rowIndex + 1;
        } else {
            // Generate using AI model only - no fallbacks
            try {
                if (!generator) {
                    throw new Error('AI model not available');
                }
                    // Create contextual prompt using previously generated fields
                    let prompt;
                    const columnName = col.name.toLowerCase();
                    
                    
                    // Ultra-simple prompts - just examples without explanatory text
                    if (columnName.includes('first') && columnName.includes('name')) {
                        prompt = `Alice`; 
                    } else if (columnName.includes('last') && columnName.includes('name')) {
                        prompt = `Smith`;
                    } else if (columnName.includes('email')) {
                        prompt = `alice@example.com`;
                    } else if (columnName.includes('salary')) {
                        prompt = `75000.50`;
                    } else if (columnName.includes('date')) {
                        prompt = `2023-01-15`;
                    } else if (columnName.includes('department')) {
                        prompt = `Sales`;
                    } else {
                        // Generic based on type - no context words
                        if (type.includes('INT')) {
                            prompt = `42`;
                        } else if (type.includes('REAL') || type.includes('FLOAT')) {
                            prompt = `123.45`;
                        } else if (type.includes('DATE')) {
                            prompt = `2023-06-01`;
                        } else {
                            prompt = `sample`;
                        }
                    }
                    
                    if (promptDisplay) {
                        promptDisplay.style.display = 'block';
                        promptDisplay.textContent = `AI Prompt: ${prompt}`;
                    }
                    
                    // Add timeout to prevent hanging
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('AI generation timeout')), 5000)
                    );
                    
                    const generationPromise = generator.generate(prompt, {
                        max_new_tokens: 3,
                        temperature: 0.8,
                        do_sample: true,
                        top_p: 0.95,
                    });
                    
                    const output = await Promise.race([generationPromise, timeoutPromise]);
                    
                    // Extract the generated value from the complete output
                    let generatedText = output[0].generated_text || '';
                    console.log('Raw AI output:', generatedText);
                    
                    // Use the complete output for tiny models
                    if (generatedText.length === 0) {
                        throw new Error('AI returned empty response');
                    }
                    
                    // Parse based on column type
                    values[col.name] = parseGeneratedValue(generatedText, col.type, col.name);
                
            } catch (error) {
                console.warn(`AI generation failed for ${col.name}:`, error);
                throw error; // Propagate error instead of falling back
            }
        }
    }
    
    return values;
}


// Parse AI-generated value - take the raw output directly
function parseGeneratedValue(value, type, columnName) {
    type = type.toUpperCase();
    
    // Take the first line/word from AI output as-is
    const firstLine = value.split('\n')[0].trim();
    const cleanValue = firstLine.split(' ')[0].trim();
    
    console.log('Using raw AI value:', JSON.stringify(cleanValue));
    
    if (!cleanValue || cleanValue.length === 0) {
        throw new Error('AI generated empty value');
    }
    
    // For integers and floats, try to parse, but if it fails, throw error
    if (type.includes('INT')) {
        const parsed = parseInt(cleanValue);
        if (isNaN(parsed)) {
            throw new Error(`AI did not generate valid integer: "${cleanValue}"`);
        }
        return parsed;
        
    } else if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) {
        const parsed = parseFloat(cleanValue);
        if (isNaN(parsed)) {
            throw new Error(`AI did not generate valid float: "${cleanValue}"`);
        }
        return parsed;
        
    } else {
        // For text/dates, return exactly what AI generated
        return cleanValue;
    }
}

// Generate multiple rows
async function generateData() {
    if (!generator) {
        showMessage('error', '❌ AI model not loaded. Please use a WebGPU-enabled browser.');
        return;
    }

    const rowCount = parseInt(document.getElementById('rowCount').value) || 5;
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const generateBtn = document.getElementById('generateBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    isGenerating = true;
    stopGeneration = false;
    generatedData = [];
    
    generateBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
    progressContainer.style.display = 'block';
    
    try {
        // Clear existing data
        db.run(`DELETE FROM ${currentTable}`);
        
        for (let i = 0; i < rowCount; i++) {
            if (stopGeneration) {
                showMessage('info', `🛑 Generation stopped by user. Generated ${i} rows.`);
                break;
            }
            
            // Update progress
            const progress = ((i + 1) / rowCount) * 100;
            progressFill.style.width = `${progress}%`;
            progressFill.textContent = `${Math.round(progress)}%`;
            progressText.textContent = `AI is generating row ${i + 1} of ${rowCount}...`;
            
            // Generate row data with retry mechanism for AI failures only
            let retries = 5;
            let rowData = null;
            
            while (retries > 0 && !rowData) {
                try {
                    rowData = await generateDataRow(i);
                    
                    // Insert into database
                    const columns = Object.keys(rowData).join(', ');
                    const placeholders = Object.keys(rowData).map(() => '?').join(', ');
                    const values = Object.values(rowData);
                    
                    db.run(`INSERT INTO ${currentTable} (${columns}) VALUES (${placeholders})`, values);
                    generatedData.push(rowData);
                    break;
                    
                } catch (error) {
                    retries--;
                    console.warn(`AI generation attempt failed (${6-retries}/5) for row ${i + 1}:`, error.message);
                    progressText.textContent = `Row ${i + 1}: AI retry ${6-retries}/5...`;
                    
                    if (retries === 0) {
                        console.error(`Failed to generate row ${i + 1} after 5 attempts:`, error);
                        throw new Error(`AI model failed to generate valid data for row ${i + 1} after 5 attempts`);
                    }
                    
                    // Brief delay before retry
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            // Update preview periodically
            if ((i + 1) % 5 === 0 || i === rowCount - 1) {
                displayData();
            }
            
            // Small delay to keep UI responsive
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        if (!stopGeneration) {
            showMessage('success', `✅ AI successfully generated ${rowCount} rows of realistic data!`);
        }
        
        document.getElementById('downloadBtn').disabled = false;
        
    } catch (error) {
        showMessage('error', `❌ Error during AI generation: ${error.message}`);
    } finally {
        isGenerating = false;
        generateBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
        progressContainer.style.display = 'none';
    }
}

// Display data with pagination
function displayData() {
    if (generatedData.length === 0) return;
    
    const dataPreview = document.getElementById('dataPreview');
    const pagination = document.getElementById('pagination');
    
    const totalPages = Math.ceil(generatedData.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, generatedData.length);
    const pageData = generatedData.slice(start, end);
    
    // Create table
    let html = '<table class="data-table"><thead><tr>';
    
    // Headers
    for (const col of tableColumns) {
        html += `<th>${col.name}</th>`;
    }
    html += '</tr></thead><tbody>';
    
    // Rows
    for (const row of pageData) {
        html += '<tr>';
        for (const col of tableColumns) {
            html += `<td>${row[col.name] !== null && row[col.name] !== undefined ? row[col.name] : 'NULL'}</td>`;
        }
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    dataPreview.innerHTML = html;
    
    // Initialize column resizing functionality
    initColumnResizing();
    
    // Update pagination
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    
    pagination.style.display = generatedData.length > rowsPerPage ? 'flex' : 'none';
}

// Download CSV
function downloadCSV() {
    if (generatedData.length === 0) {
        showMessage('error', 'No data to download.');
        return;
    }
    
    // Create CSV content
    const headers = tableColumns.map(col => col.name).join(',');
    const rows = generatedData.map(row => 
        tableColumns.map(col => {
            const value = row[col.name];
            // Escape values containing commas or quotes
            if (value && value.toString().includes(',') || value && value.toString().includes('"')) {
                return `"${value.toString().replace(/"/g, '""')}"`;
            }
            return value !== null && value !== undefined ? value : '';
        }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTable}_ai_generated_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('success', `✅ Downloaded ${generatedData.length} rows of AI-generated data as CSV.`);
}

// Show message
function showMessage(type, text) {
    const container = document.getElementById('validationMessage');
    container.innerHTML = `<div class="message ${type}">${text}</div>`;
    
    if (type !== 'error' && type !== 'warning') {
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

// Clear all data
function clearAll() {
    generatedData = [];
    currentPage = 1;
    document.getElementById('dataPreview').innerHTML = `
        <p style="color: #999; text-align: center; padding: 40px;">
            No data generated yet. Validate your DDL and click "Generate with AI" to let Gemma 3 270M create realistic data.
        </p>
    `;
    document.getElementById('pagination').style.display = 'none';
    document.getElementById('downloadBtn').disabled = true;
    showMessage('info', '🗑 All data cleared.');
}

// Event listeners
document.getElementById('validateBtn').addEventListener('click', validateDDL);

document.getElementById('generateBtn').addEventListener('click', () => {
    if (!currentTable) {
        showMessage('error', 'Please validate your DDL first.');
        return;
    }
    if (!generator) {
        showMessage('error', 'AI model not loaded. Please use a WebGPU-enabled browser.');
        return;
    }
    generateData();
});

document.getElementById('stopBtn').addEventListener('click', () => {
    stopGeneration = true;
});

document.getElementById('downloadBtn').addEventListener('click', downloadCSV);

document.getElementById('clearBtn').addEventListener('click', clearAll);

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayData();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(generatedData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayData();
    }
});

// Initialize on load
window.addEventListener('load', async () => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('show');
    
    // Check WebGPU first
    const hasWebGPU = await checkWebGPU();
    
    // Initialize SQL.js
    const sqlReady = await initSQL();
    
    if (!sqlReady) {
        loadingOverlay.classList.remove('show');
        return;
    }
    
    // Only load model if WebGPU is available
    if (hasWebGPU) {
        await initModel();
    } else {
        loadingOverlay.classList.remove('show');
        document.getElementById('generateBtn').disabled = true;
    }
});

// Initialize column resizing functionality
function initColumnResizing() {
    const table = document.querySelector('.data-table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    let isResizing = false;
    let currentColumn = null;
    let startX = 0;
    let startWidth = 0;
    
    headers.forEach((header, index) => {
        // Skip the last column to avoid issues
        if (index === headers.length - 1) return;
        
        header.style.position = 'relative';
        header.style.cursor = 'default';
        
        // Mouse down on resize handle
        header.addEventListener('mousedown', (e) => {
            const rect = header.getBoundingClientRect();
            const isOnBorder = e.clientX > rect.right - 8 && e.clientX <= rect.right;
            
            if (isOnBorder) {
                isResizing = true;
                currentColumn = header;
                startX = e.clientX;
                startWidth = header.offsetWidth;
                
                document.body.style.cursor = 'col-resize';
                document.body.classList.add('resizing');
                
                e.preventDefault();
            }
        });
        
        // Change cursor when hovering over resize handle
        header.addEventListener('mousemove', (e) => {
            if (isResizing) return;
            
            const rect = header.getBoundingClientRect();
            const isOnBorder = e.clientX > rect.right - 8 && e.clientX <= rect.right;
            
            header.style.cursor = isOnBorder ? 'col-resize' : 'default';
        });
    });
    
    // Global mouse move handler
    document.addEventListener('mousemove', (e) => {
        if (!isResizing || !currentColumn) return;
        
        const diff = e.clientX - startX;
        const newWidth = Math.max(100, startWidth + diff); // Minimum width of 100px
        
        currentColumn.style.width = newWidth + 'px';
        currentColumn.style.minWidth = newWidth + 'px';
        
        // Also set width on corresponding cells in the column
        const columnIndex = Array.from(currentColumn.parentElement.children).indexOf(currentColumn);
        const cells = table.querySelectorAll(`td:nth-child(${columnIndex + 1})`);
        cells.forEach(cell => {
            cell.style.width = newWidth + 'px';
            cell.style.minWidth = newWidth + 'px';
            cell.style.maxWidth = newWidth + 'px';
        });
    });
    
    // Global mouse up handler
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentColumn = null;
            document.body.style.cursor = 'default';
            document.body.classList.remove('resizing');
        }
    });
}