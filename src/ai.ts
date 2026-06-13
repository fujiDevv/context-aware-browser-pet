export async function getAiEmotion(
  pageTitle: string,
  metaDescription: string | undefined,
  apiKey: string,
  persona: string,
  statsContext?: string
): Promise<{ emotion: string; comment?: string }> {
  try {
    const response = await new Promise<any>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'get-local-ai-emotion',
          pageTitle,
          metaDescription,
          persona,
          statsContext
        },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (res && res.success) {
            resolve(res);
          } else {
            reject(new Error(res?.error || 'Unknown error'));
          }
        }
      );
    });

    return {
      emotion: response.emotion || 'happy',
      comment: response.comment
    };
  } catch (error) {
    console.warn('[Clawd Local AI] Inference failed, falling back to happy:', error);
    return { emotion: 'happy' };
  }
}

