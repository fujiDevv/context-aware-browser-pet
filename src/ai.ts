export async function getAiEmotion(
  pageTitle: string,
  metaDescription: string | undefined,
  apiKey: string
): Promise<string> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'get-ai-emotion',
      pageTitle,
      metaDescription,
      apiKey
    }, (response: { success: boolean; emotion?: string; error?: string } | undefined) => {
      if (chrome.runtime.lastError) {
        console.warn('AI mood analysis communication error:', chrome.runtime.lastError.message);
        resolve('happy');
        return;
      }
      
      if (response && response.success && response.emotion) {
        resolve(response.emotion);
      } else {
        console.warn('AI mood analysis API failure:', response ? response.error : 'Unknown error');
        resolve('happy');
      }
    });
  });
}
