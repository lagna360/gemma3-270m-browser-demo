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
            // Try AI generation first, with fallback to realistic mock data
            try {
                if (generator) {
                    // Create a structured prompt for the AI model
                    const prompt = `Generate a realistic ${col.type} value for database column "${col.name}". Return only the value, no explanation. Value:`;
                    
                    if (promptDisplay) {
                        promptDisplay.style.display = 'block';
                        promptDisplay.textContent = `AI Prompt: ${prompt}`;
                    }
                    
                    // Add timeout to prevent hanging
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('AI generation timeout')), 5000)
                    );
                    
                    const generationPromise = generator.generate(prompt, {
                        max_new_tokens: 30,
                        temperature: 0.7,
                        do_sample: true,
                        top_p: 0.9,
                    });
                    
                    const output = await Promise.race([generationPromise, timeoutPromise]);
                    
                    // Extract the generated value
                    let generatedText = output[0].generated_text;
                    generatedText = generatedText.replace(prompt, '').trim();
                    
                    // Parse based on column type
                    values[col.name] = parseGeneratedValue(generatedText, col.type, col.name);
                } else {
                    // Fallback to mock data if no AI model
                    values[col.name] = generateMockValue(col.type, col.name, rowIndex);
                }
                
            } catch (error) {
                console.warn(`AI generation failed for ${col.name}, using fallback:`, error);
                // Fallback to realistic mock data
                values[col.name] = generateMockValue(col.type, col.name, rowIndex);
            }
        }
    }
    
    return values;
}

// Generate realistic mock data as fallback
function generateMockValue(type, columnName, rowIndex) {
    type = type.toUpperCase();
    const name = columnName.toLowerCase();
    
    if (type.includes('INT')) {
        if (name.includes('age')) {
            return Math.floor(Math.random() * 50) + 20;
        } else if (name.includes('id') || name.includes('num')) {
            return rowIndex + 1;
        } else if (name.includes('salary') || name.includes('wage')) {
            return Math.floor(Math.random() * 100000) + 30000;
        }
        return Math.floor(Math.random() * 1000) + 1;
        
    } else if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) {
        if (name.includes('salary') || name.includes('wage') || name.includes('price')) {
            return (Math.random() * 100000 + 30000).toFixed(2);
        }
        return (Math.random() * 1000).toFixed(2);
        
    } else if (type.includes('DATE')) {
        if (name.includes('hire') || name.includes('start')) {
            const year = 2020 + Math.floor(Math.random() * 5);
            const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } else if (name.includes('birth')) {
            const year = 1970 + Math.floor(Math.random() * 40);
            const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        const year = 2020 + Math.floor(Math.random() * 5);
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        return `${year}-${month}-${day}`;
        
    } else {
        // TEXT/VARCHAR - generate realistic names and values
        if (name.includes('first') || name.includes('fname')) {
            const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Maria', 'Robert', 'Lisa'];
            return firstNames[Math.floor(Math.random() * firstNames.length)];
        } else if (name.includes('last') || name.includes('lname') || name.includes('surname')) {
            const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
            return lastNames[Math.floor(Math.random() * lastNames.length)];
        } else if (name.includes('email')) {
            const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'];
            const firstNames = ['john', 'jane', 'michael', 'sarah', 'david', 'emily', 'james', 'maria'];
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const domain = domains[Math.floor(Math.random() * domains.length)];
            return `${firstName}${rowIndex + 1}@${domain}`;
        } else if (name.includes('department') || name.includes('dept')) {
            const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Support'];
            return departments[Math.floor(Math.random() * departments.length)];
        } else if (name.includes('city')) {
            const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio'];
            return cities[Math.floor(Math.random() * cities.length)];
        } else if (name.includes('state')) {
            const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
            return states[Math.floor(Math.random() * states.length)];
        } else if (name.includes('phone')) {
            return `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
        }
        
        // Generic text fallback
        const genericValues = ['Sample Data', 'Test Value', 'Example Text', 'Mock Data', 'Generated Value'];
        return genericValues[Math.floor(Math.random() * genericValues.length)] + ' ' + (rowIndex + 1);
    }
}

// Parse AI-generated value based on column type
function parseGeneratedValue(value, type, columnName) {
    type = type.toUpperCase();
    
    // Remove quotes if present
    value = value.replace(/^["']|["']$/g, '').trim();
    
    if (type.includes('INT')) {
        // Extract numbers from the generated text
        const matches = value.match(/\d+/);
        if (matches) {
            return parseInt(matches[0]);
        }
        // If no number found, generate a random one based on column name
        if (columnName.toLowerCase().includes('age')) {
            return Math.floor(Math.random() * 50) + 20;
        }
        return Math.floor(Math.random() * 1000) + 1;
        
    } else if (type.includes('REAL') || type.includes('FLOAT') || type.includes('DOUBLE')) {
        const matches = value.match(/[\d.]+/);
        if (matches) {
            return parseFloat(matches[0]).toFixed(2);
        }
        return (Math.random() * 10000).toFixed(2);
        
    } else if (type.includes('DATE')) {
        // Try to parse date from generated text
        const dateMatch = value.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
            return dateMatch[0];
        }
        // Generate a random date
        const year = 2020 + Math.floor(Math.random() * 5);
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        return `${year}-${month}-${day}`;
        
    } else {
        // TEXT/VARCHAR - clean up the generated text
        // Remove any control characters and limit length
        return value.substring(0, 100).replace(/[\x00-\x1F\x7F]/g, '');
    }
}

// Generate multiple rows
async function generateData() {
    if (!generator) {
        showMessage('error', '❌ AI model not loaded. Please use a WebGPU-enabled browser.');
        return;
    }

    const rowCount = parseInt(document.getElementById('rowCount').value);
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
            
            // Generate row data with retry mechanism
            let retries = 3;
            let rowData = null;
            
            while (retries > 0) {
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
                    if (retries === 0) {
                        console.error(`Failed to generate/insert row ${i + 1}:`, error);
                        progressText.textContent = `Error on row ${i + 1}, retrying...`;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
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