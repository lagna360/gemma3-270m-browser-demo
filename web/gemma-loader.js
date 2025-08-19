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
        this.modelPath = 'onnx-community/gemma-3-270m-it-ONNX';
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
            const { pipeline, env, TextStreamer } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@latest');

            // Configure Transformers.js for HuggingFace models
            env.allowLocalModels = false; // Use HuggingFace directly
            env.useBrowserCache = true;   // Cache downloaded models  
            env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';

            this.updateProgress('Configuring ONNX runtime...', 30);

            // Download and load Gemma 3 270M from HuggingFace
            this.updateProgress('Downloading Gemma 3 270M from HuggingFace...', 40);
            
            this.model = await pipeline(
                'text-generation',
                this.modelPath,
                { 
                    dtype: 'fp32',
                    device: 'webgpu',
                    progress_callback: (progress) => {
                        if (progress.status === 'downloading') {
                            const percent = Math.round((progress.loaded / progress.total) * 100);
                            this.updateProgress(`Downloading model: ${percent}%`, 40 + (percent * 0.5));
                        } else if (progress.status === 'loading') {
                            this.updateProgress('Loading model into memory...', 90);
                        } else if (progress.status === 'ready') {
                            this.updateProgress('Model ready!', 100);
                        }
                    }
                }
            );

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
            do_sample: false,
        };

        const mergedOptions = { ...defaultOptions, ...options };

        try {
            console.log('🤖 Generating with prompt:', prompt);
            console.log('⚙️ Options:', mergedOptions);

            // Use the message format as shown in HuggingFace documentation
            const messages = [
                { role: "user", content: prompt }
            ];

            const result = await this.model(messages, mergedOptions);
            
            console.log('✅ Generation completed:', result);
            
            // Extract the generated text from the response
            if (result && result[0] && result[0].generated_text) {
                const generatedText = result[0].generated_text.at(-1).content;
                return [{ generated_text: generatedText }];
            }
            
            return result;

        } catch (error) {
            throw new Error(`Text generation failed: ${error.message}`);
        }
    }

    /**
     * Generate text with streaming support using TextStreamer
     */
    async generateStream(prompt, options = {}, onToken = null) {
        if (!this.isLoaded || !this.model) {
            throw new Error('Model not loaded. Call loadModel() first.');
        }

        const defaultOptions = {
            max_new_tokens: 256,
            do_sample: true,
            temperature: 0.8,
        };

        const mergedOptions = { ...defaultOptions, ...options };

        try {
            console.log('🤖 Generating with streaming - prompt:', prompt);
            console.log('⚙️ Streaming options:', mergedOptions);

            // Import TextStreamer from the already imported module
            const { TextStreamer } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@latest');

            // Create TextStreamer with callback if provided
            let streamer = null;
            if (onToken) {
                streamer = new TextStreamer(this.model.tokenizer, {
                    skip_prompt: true,
                    skip_special_tokens: true,
                    callback_function: onToken
                });
            }

            // Use the message format
            const messages = [
                { role: "user", content: prompt }
            ];

            // Add streamer to options if available
            const streamOptions = streamer ? { ...mergedOptions, streamer } : mergedOptions;

            const result = await this.model(messages, streamOptions);
            
            console.log('✅ Streaming generation completed:', result);
            
            // Extract the generated text from the response
            if (result && result[0] && result[0].generated_text) {
                const generatedText = result[0].generated_text.at(-1).content;
                return [{ generated_text: generatedText }];
            }
            
            return result;

        } catch (error) {
            console.error('Streaming generation error:', error);
            throw new Error(`Streaming text generation failed: ${error.message}`);
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