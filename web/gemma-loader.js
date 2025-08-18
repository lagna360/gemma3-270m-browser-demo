/**
 * Gemma 3 270M Browser Loader
 * 
 * Utilities for loading and running the converted Gemma 3 270M ONNX model
 * in the browser with WebGPU acceleration.
 */

class GemmaLoader {
    constructor() {
        this.model = null;
        this.tokenizer = null;
        this.isLoaded = false;
        this.isLoading = false;
        this.modelPath = './models/gemma-3-270m-onnx/';
        this.progressCallback = null;
    }

    /**
     * Set up WebGPU and check compatibility
     */
    async checkWebGPU() {
        if (!('gpu' in navigator)) {
            throw new Error('WebGPU is not supported in this browser');
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                throw new Error('WebGPU adapter not available');
            }

            const device = await adapter.requestDevice();
            console.log('✅ WebGPU device acquired:', device);
            return true;
        } catch (error) {
            throw new Error(`WebGPU initialization failed: ${error.message}`);
        }
    }

    /**
     * Load the converted Gemma 3 270M model
     */
    async loadModel(progressCallback = null) {
        if (this.isLoaded) {
            console.log('Model already loaded');
            return this.model;
        }

        if (this.isLoading) {
            throw new Error('Model is already being loaded');
        }

        this.isLoading = true;
        this.progressCallback = progressCallback;

        try {
            // Check WebGPU support first
            await this.checkWebGPU();
            this.updateProgress('WebGPU ready', 10);

            // Import Transformers.js
            this.updateProgress('Loading Transformers.js...', 20);
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');

            // Configure Transformers.js for local models
            env.allowLocalModels = true;
            env.useBrowserCache = true;
            env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/';

            this.updateProgress('Configuring ONNX runtime...', 30);

            // Load the local model
            this.updateProgress('Loading Gemma 3 270M model...', 40);
            
            try {
                this.model = await pipeline('text-generation', this.modelPath, {
                    progress_callback: (progress) => {
                        if (progress.status === 'downloading') {
                            const percent = Math.round((progress.loaded / progress.total) * 100);
                            this.updateProgress(`Downloading model: ${percent}%`, 40 + (percent * 0.5));
                        } else if (progress.status === 'loading') {
                            this.updateProgress('Loading model into memory...', 90);
                        } else if (progress.status === 'ready') {
                            this.updateProgress('Model ready!', 100);
                        }
                    },
                    device: 'webgpu', // Use WebGPU for acceleration
                    dtype: 'fp16',    // Use 16-bit floating point for better performance
                });
                
            } catch (localError) {
                // Fallback: try to load from a CDN or alternative path
                console.warn('Local model loading failed, trying alternative...', localError);
                this.updateProgress('Trying alternative model source...', 50);
                
                // You might need to upload the converted model to a CDN or adjust the path
                throw new Error(`Model loading failed: ${localError.message}`);
            }

            this.isLoaded = true;
            this.updateProgress('Gemma 3 270M loaded successfully!', 100);
            
            console.log('✅ Gemma 3 270M model loaded successfully');
            return this.model;

        } catch (error) {
            this.isLoading = false;
            throw new Error(`Failed to load Gemma 3 270M: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Generate text using the loaded model
     */
    async generate(prompt, options = {}) {
        if (!this.isLoaded || !this.model) {
            throw new Error('Model not loaded. Call loadModel() first.');
        }

        const defaultOptions = {
            max_new_tokens: 50,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
            repetition_penalty: 1.1,
            pad_token_id: 0,
        };

        const mergedOptions = { ...defaultOptions, ...options };

        try {
            console.log('🤖 Generating with prompt:', prompt);
            console.log('⚙️ Options:', mergedOptions);

            const result = await this.model(prompt, mergedOptions);
            
            console.log('✅ Generation completed');
            return result;

        } catch (error) {
            throw new Error(`Text generation failed: ${error.message}`);
        }
    }

    /**
     * Update progress for loading callbacks
     */
    updateProgress(message, percent) {
        console.log(`[${percent}%] ${message}`);
        if (this.progressCallback) {
            this.progressCallback({ message, percent });
        }
    }

    /**
     * Get model information
     */
    getModelInfo() {
        return {
            name: 'Gemma 3 270M',
            size: '270M parameters',
            format: 'ONNX',
            acceleration: 'WebGPU',
            loaded: this.isLoaded,
            loading: this.isLoading,
            path: this.modelPath
        };
    }

    /**
     * Unload the model to free memory
     */
    unload() {
        this.model = null;
        this.tokenizer = null;
        this.isLoaded = false;
        this.isLoading = false;
        console.log('🗑️ Model unloaded from memory');
    }
}

// Create a global instance
window.GemmaLoader = GemmaLoader;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GemmaLoader;
}

// Convenience function for quick setup
window.createGemmaLoader = () => new GemmaLoader();

console.log('📦 Gemma Loader utilities loaded');