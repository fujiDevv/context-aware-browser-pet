export async function getAiEmotion(
  pageTitle: string,
  metaDescription: string | undefined,
  apiKey: string,
  persona: string,
  statsContext?: string
): Promise<{ emotion: string; comment?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'get-ai-emotion',
      pageTitle,
      metaDescription,
      apiKey,
      persona,
      statsContext
    }, (response: { success: boolean; emotion?: string; comment?: string; error?: string } | undefined) => {
      if (chrome.runtime.lastError) {
        console.warn('AI mood analysis communication error:', chrome.runtime.lastError.message);
        resolve({ emotion: 'happy' });
        return;
      }
      
      if (response && response.success && response.emotion) {
        resolve({ emotion: response.emotion, comment: response.comment });
      } else {
        console.warn('AI mood analysis API failure:', response ? response.error : 'Unknown error');
        resolve({ emotion: 'happy' });
      }
    });
  });
}
