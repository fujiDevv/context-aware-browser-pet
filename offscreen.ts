// Import pipeline and env from @huggingface/transformers
import { pipeline, env } from '@huggingface/transformers';
import { detectPageCategory, mapActivityToEmotion, AI_COMMENTS } from './src/rules';

// Configure ONNX Runtime to load WASM binaries locally from the extension
const wasmConfig = (env as Record<string, any>).backends?.onnx?.wasm;
if (wasmConfig) {
  wasmConfig.wasmPaths = chrome.runtime.getURL('wasm/');
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

// Initialize/fetch the classifier pipeline
async function getClassifier(): Promise<ClassifierPipeline> {
  if (classifier) return classifier;

  if (modelLoadingState === 'loading') {
    while (modelLoadingState === 'loading') {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (classifier) return classifier;
  }

  modelLoadingState = 'loading';
  modelDownloadProgress = 0;
  chrome.runtime.sendMessage({ type: 'update-ai-progress', state: modelLoadingState, progress: modelDownloadProgress });

  try {
    const pipelineInstance = await pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      {
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            modelDownloadProgress = Math.round(data.progress);
            chrome.runtime.sendMessage({ type: 'update-ai-progress', state: 'loading', progress: modelDownloadProgress });
          } else if (data.status === 'ready') {
            modelDownloadProgress = 100;
            chrome.runtime.sendMessage({ type: 'update-ai-progress', state: 'ready', progress: 100 });
          }
        }
      }
    );
    classifier = pipelineInstance as unknown as ClassifierPipeline;
    modelLoadingState = 'ready';
    chrome.runtime.sendMessage({ type: 'update-ai-progress', state: modelLoadingState, progress: 100 });
    return classifier;
  } catch (err) {
    modelLoadingState = 'error';
    chrome.runtime.sendMessage({ type: 'update-ai-progress', state: modelLoadingState, progress: 0 });
    console.error('[Clawd Local AI] Failed to load pipeline:', err);
    throw err;
  }
}

// Since the background script only creates this offscreen document when AI Mode is enabled,
// we can safely begin loading the classifier as soon as this script executes.
getClassifier().catch((e) => { console.warn('[Clawd Offscreen] getClassifier init error:', e); });

async function getLocalAiEmotion(
  pageTitle: string,
  metaDescription: string | undefined,
  url: string,
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

  // Detect page activity/category using shared rules
  const category = detectPageCategory(url, pageTitle);

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
    console.warn('[Clawd Local AI] Pipeline classification failed, falling back to NEUTRAL:', err);
  }

  // Map to final pet emotion using shared rules
  const emotion = mapActivityToEmotion(category, sentiment, energy);

  // Generate comment based on persona, category, and sentiment from shared AI_COMMENTS
  const personaComments = AI_COMMENTS[persona] || AI_COMMENTS.default;
  const categoryComments = personaComments[category] || personaComments.general;
  const sentimentComments = categoryComments[sentiment] || categoryComments.NEUTRAL;

  const commentList = sentimentComments.length > 0 ? sentimentComments : categoryComments.NEUTRAL;
  const comment = commentList[Math.floor(Math.random() * commentList.length)];

  return { emotion, comment, category, sentiment };
}

// Set up Chrome runtime message listener in the offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'run-local-ai-inference') {
    const { pageTitle, metaDescription, persona, statsContext, sentimentSensitivity, url } = message;

    getLocalAiEmotion(pageTitle, metaDescription, url, persona || 'default', statsContext, sentimentSensitivity)
      .then((result) => sendResponse({ success: true, emotion: result.emotion, comment: result.comment, category: result.category, sentiment: result.sentiment }))
      .catch((err) => {
        console.error('Error in local AI emotion processing:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'check-local-ai-status') {
    sendResponse({ success: true, state: modelLoadingState, progress: modelDownloadProgress });
    return false;
  }
});
