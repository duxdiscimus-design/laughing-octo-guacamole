package com.duxdiscimus.scheduleai.ai

import android.content.Context
import android.util.Log
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages the on-device Gemma LLM via MediaPipe LLM Inference API.
 *
 * Supported models (place in app's files/models/ directory):
 *   - gemma3-1b-it-int4.bin   (~0.9 GB, fastest, good for Pixel 10 Pro)
 *   - gemma3-4b-it-int4.bin   (~2.5 GB, best quality, recommended for Pixel 10 Pro)
 *   - gemma-2b-it-gpu-int4.bin (~1.4 GB, GPU-accelerated)
 *
 * Download from: https://www.kaggle.com/models/google/gemma/
 */
@Singleton
class LlmInferenceManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var llmInference: LlmInference? = null

    private val _state = MutableStateFlow<LlmState>(LlmState.Uninitialized)
    val state: StateFlow<LlmState> = _state.asStateFlow()

    val isReady: Boolean get() = _state.value is LlmState.Ready

    // Supported model filenames in priority order
    private val preferredModelNames = listOf(
        "gemma3-4b-it-int4.bin",
        "gemma3-1b-it-int4.bin",
        "gemma-2b-it-gpu-int4.bin",
        "gemma-2b-it-int4.bin",
        "model.bin"
    )

    /**
     * Find the model file in supported locations.
     */
    private fun findModelFile(): File? {
        val searchDirs = listOf(
            File(context.filesDir, "models"),
            context.filesDir,
            context.getExternalFilesDir("models"),
            context.getExternalFilesDir(null)
        )

        for (dir in searchDirs) {
            if (dir == null || !dir.exists()) continue
            for (name in preferredModelNames) {
                val f = File(dir, name)
                if (f.exists() && f.length() > 1_000_000) return f
            }
            // Also check any .bin file
            dir.listFiles { f -> f.extension == "bin" && f.length() > 1_000_000 }
                ?.firstOrNull()
                ?.let { return it }
        }
        return null
    }

    /**
     * Initialize the LLM. Call from a background coroutine.
     */
    suspend fun initialize(): Boolean = withContext(Dispatchers.IO) {
        if (_state.value is LlmState.Ready) return@withContext true
        _state.value = LlmState.Loading

        val modelFile = findModelFile()
        if (modelFile == null) {
            _state.value = LlmState.ModelNotFound
            Log.w(TAG, "No Gemma model found. Place model in ${context.filesDir}/models/")
            return@withContext false
        }

        return@withContext try {
            Log.i(TAG, "Loading model: ${modelFile.name} (${modelFile.length() / 1_000_000}MB)")
            val options = LlmInference.LlmInferenceOptions.builder()
                .setModelPath(modelFile.absolutePath)
                .setMaxTokens(MAX_TOKENS)
                .setTopK(TOP_K)
                .setTemperature(TEMPERATURE)
                .setRandomSeed(SEED)
                .build()

            llmInference = LlmInference.createFromOptions(context, options)
            _state.value = LlmState.Ready(modelFile.name)
            Log.i(TAG, "Model loaded successfully: ${modelFile.name}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load model: ${e.message}", e)
            _state.value = LlmState.Error(e.message ?: "Unknown error loading model")
            false
        }
    }

    /**
     * Generate a response for the given prompt.
     * Calls [onPartialResult] for streaming tokens.
     */
    suspend fun generateResponse(
        prompt: String,
        onPartialResult: ((String, Boolean) -> Unit)? = null
    ): String = withContext(Dispatchers.IO) {
        val inference = llmInference
            ?: return@withContext "AI model is not loaded. Please initialize first."

        return@withContext try {
            if (onPartialResult != null) {
                val builder = StringBuilder()
                inference.generateResponseAsync(prompt) { partial, done ->
                    builder.append(partial)
                    onPartialResult(partial, done)
                }
                // Wait for async generation to complete
                // The async callback handles streaming
                builder.toString()
            } else {
                inference.generateResponse(prompt)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Generation error: ${e.message}", e)
            "Error generating response: ${e.message}"
        }
    }

    fun close() {
        llmInference?.close()
        llmInference = null
        _state.value = LlmState.Uninitialized
    }

    fun getModelPath(): String? {
        return findModelFile()?.absolutePath
    }

    fun getModelsDirectory(): File {
        return File(context.filesDir, "models").also { it.mkdirs() }
    }

    companion object {
        private const val TAG = "LlmInferenceManager"
        private const val MAX_TOKENS = 2048
        private const val TOP_K = 40
        private const val TEMPERATURE = 0.7f
        private const val SEED = 42
    }
}

sealed class LlmState {
    data object Uninitialized : LlmState()
    data object Loading : LlmState()
    data class Ready(val modelName: String) : LlmState()
    data object ModelNotFound : LlmState()
    data class Error(val message: String) : LlmState()
}
