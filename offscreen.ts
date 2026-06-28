// Import pipeline and env from @huggingface/transformers
import { pipeline, env } from '@huggingface/transformers';
import { detectPageCategory, mapActivityToEmotion, AI_COMMENTS } from './src/rules';
import { extensionApi, getRuntimeUrl } from './src/platform';

// Configure ONNX Runtime to load WASM binaries locally from the extension
const wasmConfig = (env as Record<string, any>).backends?.onnx?.wasm;
if (wasmConfig) {
  wasmConfig.wasmPaths = getRuntimeUrl('wasm/');
  wasmConfig.numThreads = 1;
  wasmConfig.proxy = false;
}
env.allowLocalModels = false; // Force fetching from Hugging Face Hub (cached locally in IndexedDB)

interface TextClassificationResult {
  label: string;
  score: number;
}

type ClassifierPipeline = (text: string) => Promise<TextClassificationResult[]>;

let classifier: ClassifierPipeline | null = null;
let modelLoadingState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let modelDownloadProgress = 0;

function reportAiProgress(state: typeof modelLoadingState, progress: number): void {
  extensionApi.runtime.sendMessage({ type: 'update-ai-progress', state, progress })
    .catch((e) => { console.warn('[Arcrawls Offscreen] update-ai-progress message failed:', e); });
}

let classifierPromise: Promise<ClassifierPipeline> | null = null;

// Initialize/fetch the classifier pipeline
async function getClassifier(): Promise<ClassifierPipeline> {
  if (classifier) return classifier;

  if (classifierPromise) {
    return classifierPromise;
  }

  modelLoadingState = 'loading';
  modelDownloadProgress = 0;
  reportAiProgress(modelLoadingState, modelDownloadProgress);

  classifierPromise = (async () => {
    try {
      const pipelineInstance = await pipeline(
        'text-classification',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        {
          progress_callback: (data: any) => {
            if (data.status === 'progress') {
              modelDownloadProgress = Math.round(data.progress);
              reportAiProgress('loading', modelDownloadProgress);
            } else if (data.status === 'ready') {
              modelDownloadProgress = 100;
              reportAiProgress('ready', 100);
            }
          }
        }
      );
      classifier = pipelineInstance as unknown as ClassifierPipeline;
      modelLoadingState = 'ready';
      reportAiProgress(modelLoadingState, 100);
      return classifier;
    } catch (err) {
      modelLoadingState = 'error';
      reportAiProgress(modelLoadingState, 0);
      console.error('[Arcrawls Local AI] Failed to load pipeline:', err);
      classifierPromise = null;
      throw err;
    }
  })();

  return classifierPromise;
}

// Initialize/fetch the classifier pipeline is now lazily triggered on first request

async function getLocalAiEmotion(
  pageTitle: string,
  metaDescription: string | undefined,
  url: string,
  category: string,
  persona: string,
  statsContext?: string,
  sentimentSensitivity: number = 50
): Promise<{ emotion: string; comment?: string; category?: string; sentiment?: string }> {
  if (modelLoadingState === 'loading' || modelLoadingState === 'idle') {
    return {
      emotion: 'working-thinking',
      comment: `Downloading my local AI model... (${modelDownloadProgress}%) 🧠`
    };
  }
  if (modelLoadingState === 'error') {
    return {
      emotion: 'sad',
      comment: 'Failed to load local AI model. Please check the background console.'
    };
  }

  // Parse stats from statsContext
  let energy = 50;
  if (statsContext) {
    const energyMatch = statsContext.match(/Energy:\s*(\d+)%/);
    if (energyMatch) energy = parseInt(energyMatch[1]);
  }

  // Use the pre-determined category passed from the content script
  const finalCategory = category || detectPageCategory(url, pageTitle);

  let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
  let score = 0.5;

  try {
    const pipelineInstance = await getClassifier();
    const textToAnalyze = `${pageTitle}. ${metaDescription || ''}`.substring(0, 500);
    const results = await pipelineInstance(textToAnalyze);

    if (results && results.length > 0) {
      const topResult = results[0];
      score = topResult.score;
      // Default sensitivity is 50, which maps to a threshold of ~0.65
      // 0 sensitivity = 0.90 threshold, 100 sensitivity = 0.50 threshold
      const threshold = 0.90 - (sentimentSensitivity / 100) * 0.40;
      if (score > threshold) {
        sentiment = topResult.label as 'POSITIVE' | 'NEGATIVE';
      }
    }
  } catch (err) {
    console.warn('[Arcrawls Local AI] Pipeline classification failed, falling back to NEUTRAL:', err);
  }

  // Map to final pet emotion using shared rules
  const emotion = mapActivityToEmotion(finalCategory, sentiment, energy);

  // Generate comment based on persona, category, and sentiment from shared AI_COMMENTS
  const personaComments = AI_COMMENTS[persona] || AI_COMMENTS.default;
  const categoryComments = personaComments[finalCategory] || personaComments.general;
  const sentimentComments = categoryComments[sentiment] || categoryComments.NEUTRAL;

  const commentList = sentimentComments.length > 0 ? sentimentComments : categoryComments.NEUTRAL;
  const comment = commentList[Math.floor(Math.random() * commentList.length)];

  return { emotion, comment, category: finalCategory, sentiment };
}

let audioCtx: AudioContext | null = null;
const audioBuffers: Record<string, AudioBuffer> = {};

async function playSound(filename: string, volume: number): Promise<void> {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    let buffer = audioBuffers[filename];
    if (!buffer) {
      const soundUrl = getRuntimeUrl(`assets/${encodeURIComponent(filename)}`);
      const response = await fetch(soundUrl);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioBuffers[filename] = buffer;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
  } catch (err) {
    console.error('[Arcrawls Offscreen] Failed to play sound:', err);
  }
}

// Set up runtime message listener in the offscreen document
extensionApi.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  if (message.type === 'run-local-ai-inference') {
    const { pageTitle, metaDescription, category, persona, statsContext, sentimentSensitivity, url } = message;

    if (modelLoadingState === 'idle') {
      getClassifier().catch((e) => console.warn('[Arcrawls Offscreen] auto-init error:', e));
    }

    getLocalAiEmotion(pageTitle, metaDescription, url, category, persona || 'default', statsContext, sentimentSensitivity)
      .then((result) => sendResponse({ success: true, emotion: result.emotion, comment: result.comment, category: result.category, sentiment: result.sentiment }))
      .catch((err) => {
        console.error('Error in local AI emotion processing:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'check-offscreen-ai-status') {
    if (modelLoadingState === 'idle') {
      getClassifier().catch((e) => console.warn('[Arcrawls Offscreen] auto-init error:', e));
    }
    sendResponse({ success: true, state: modelLoadingState, progress: modelDownloadProgress });
    return false;
  }

  if (message.type === 'play-sound-offscreen') {
    playSound(message.filename, message.volume)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
