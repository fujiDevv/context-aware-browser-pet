declare module "*.css" {
  const content: string;
  export default content;
}

interface NetworkInformation extends EventTarget {
  readonly saveData: boolean;
  readonly effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  readonly downlink: number;
  readonly rtt: number;
  onchange: EventListener;
}

interface Navigator {
  readonly connection?: NetworkInformation;
  readonly mozConnection?: NetworkInformation;
  readonly webkitConnection?: NetworkInformation;
}

interface Window {
  webkitAudioContext: typeof AudioContext;
  ai?: any; // Using any here for now as the 'ai' type is complex and defined in types.ts
}

declare global {
  var ai: any;
}

declare namespace chrome.runtime {
  function getContexts(filter: any): Promise<any[]>;
}
