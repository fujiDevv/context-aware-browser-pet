import { PetStats } from './types';
import { getDominantTrait as getTrait } from './rules';

export const EMOTIONS_METADATA: Record<string, { name: string; emoji: string }> = {
  'happy': { name: 'Happy', emoji: '😊' },
  'sad': { name: 'Sad', emoji: '😢' },
  'angry': { name: 'Angry', emoji: '😠' },
  'crying': { name: 'Crying', emoji: '😭' },
  'waving': { name: 'Waving', emoji: '👋' },
  'sleeping': { name: 'Sleeping', emoji: '💤' },
  'working-thinking': { name: 'Thinking', emoji: '🤔' },
  'shrug': { name: 'Shrug', emoji: '🤷' },
  'reading': { name: 'Reading', emoji: '📖' },
  'yoga': { name: 'Yoga', emoji: '🧘' },
  'eating': { name: 'Eating', emoji: '🍕' },
  'coding': { name: 'Coding', emoji: '💻' },
  'working-typing': { name: 'Typing', emoji: '⌨️' },
  'dancing': { name: 'Dancing', emoji: '💃' },
  'cool': { name: 'Cool', emoji: '😎' },
  'love': { name: 'Love', emoji: '❤️' },
  'celebrating': { name: 'Celebrating', emoji: '🎉' },
  'mindblown': { name: 'Mindblown', emoji: '🤯' },
  'ninja': { name: 'Ninja', emoji: '🥷' },
  'working-wizard': { name: 'Wizard', emoji: '🧙' },
  'astronaut': { name: 'Astronaut', emoji: '🧑‍🚀' },
  'working-debugger': { name: 'Debugger', emoji: '🔍' },
  'working-building': { name: 'Building', emoji: '🧱' },
  'rocket': { name: 'Rocket', emoji: '🚀' },
  'pirate': { name: 'Pirate', emoji: '🏴‍☠️' },
  'working-juggling': { name: 'Juggling', emoji: '🤹' },
  'gaming': { name: 'Gaming', emoji: '🎮' },
  'battery-low': { name: 'Low Battery', emoji: '🪫' },
  'christmas': { name: 'Christmas', emoji: '🎄' },
  'winter': { name: 'Winter', emoji: '❄️' },
  'halloween': { name: 'Halloween', emoji: '🎃' },
  'summer': { name: 'Summer', emoji: '☀️' },
  'ice-cream': { name: 'Ice Cream', emoji: '🍦' },
  'surfing': { name: 'Surfing', emoji: '🏄' },
  'skateboard': { name: 'Skateboard', emoji: '🛹' },
  'telescope': { name: 'Telescope', emoji: '🔭' },
  'meditating': { name: 'Meditating', emoji: '🧘' },
  'working-rubber-duck': { name: 'Rubber Duck', emoji: '🦆' },
  'coffee': { name: 'Coffee', emoji: '☕' },
  'mail': { name: 'Mail', emoji: '✉️' },
  'notification': { name: 'Notification', emoji: '🔔' },
  'flexing': { name: 'Flexing', emoji: '💪' },
  'lifting': { name: 'Lifting', emoji: '🏋️' },
  'singing': { name: 'Singing', emoji: '🎤' },
  'music': { name: 'Music', emoji: '🎵' },
  'dj': { name: 'DJ', emoji: '🎧' },
  'money': { name: 'Money', emoji: '💰' }
};

export function getDominantTrait(stats: PetStats | undefined): 'developer' | 'gamer' | 'scholar' | 'socialite' | 'normal' {
  const dominantTrait = getTrait(stats?.siteCategoryCounts);
  return dominantTrait as 'developer' | 'gamer' | 'scholar' | 'socialite' | 'normal';
}

/**
 * Resolves the final SVG asset name for a given mood and active costume.
 */
export function getResolvedCostumeName(mood: string, costume: string | undefined, seasonalEnabled: boolean = true): string {
  const costumeStates = ['happy', 'waving', 'smile', 'idle-living', 'yoga', 'reading', 'shrug', 'working-thinking'];
  const allowedSvgNames = new Set([
    'happy', 'waving', 'smile', 'idle-living', 'christmas', 'halloween', 'summer', 'detective', 'magic', 'rainbow',
    'sad', 'angry', 'crying', 'working-thinking', 'shrug', 'reading', 'yoga', 'eating', 'coding', 'working-typing',
    'dancing', 'cool', 'love', 'celebrating', 'mindblown', 'ninja', 'working-wizard', 'astronaut', 'working-debugger',
    'working-building', 'rocket', 'pirate', 'working-juggling', 'gaming', 'battery-low', 'winter', 'ice-cream',
    'surfing', 'skateboard', 'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'mail', 'notification',
    'flexing', 'lifting', 'singing', 'music', 'dj', 'money', 'working-merging', 'working-pushing', 'working-rollback',
    'working-deploying', 'working-firefighting', 'working-oncall', 'working-context-full', 'working-testing',
    'working-tool-calling', 'working-pairing', 'working-meeting', 'working-sweeping', 'drumming', 'podcast',
    'running', 'autumn', 'birthday', 'new-year', 'spring', 'thanksgiving', 'valentine', 'crab-walking', 'dizzy',
    'embarrassed', 'error', 'evil', 'fire', 'flying', 'gift', 'going-away', 'grumpy', 'hallucinating', 'hopeful',
    'idea', 'jealous', 'king', 'laughing', 'loading', 'peeking', 'praying', 'scared', 'security', 'shipping',
    'sick', 'skeptical', 'snow', 'star', 'static-base', 'sweeping', 'time-travel', 'trophy', 'umbrella',
    'bowling', 'camping', 'chef', 'climbing', 'crafting', 'driving', 'fishing', 'gardening', 'painting',
    'photography', 'swimming', 'bored', 'facepalm'
  ]);

  const normalizedMood = mood.trim().toLowerCase();

  // If seasonal outfits are disabled, ignore seasonal costumes (but keep permanent ones like detective)
  const seasonalCostumes = ['christmas', 'halloween', 'summer'];
  const isSeasonalRequested = costume && seasonalCostumes.includes(costume);
  const effectiveCostume = (isSeasonalRequested && !seasonalEnabled) ? 'none' : costume;

  // States that support wearing a full-body costume overlay
  if (!costumeStates.includes(normalizedMood)) {
    return allowedSvgNames.has(normalizedMood) ? normalizedMood : 'happy';
  }

  const costumeMap: Record<string, string> = {
    christmas: 'christmas',
    halloween: 'halloween',
    summer: 'summer',
    detective: 'detective',
    wizard: 'magic',
    party: 'rainbow'
  };

  if (normalizedMood === 'sweeping') {
    return 'working-sweeping';
  }

  if (effectiveCostume && costumeMap[effectiveCostume]) {
    const mapped = costumeMap[effectiveCostume];
    return allowedSvgNames.has(mapped) ? mapped : 'happy';
  }

  return allowedSvgNames.has(normalizedMood) ? normalizedMood : 'happy';
}

export function parseMarkdown(text: string): string {
  // Escape HTML first to prevent XSS
  let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // Code blocks: ```code```
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.1); padding: 8px; border-radius: 6px; overflow-x: auto; margin: 6px 0;"><code>$1</code></pre>');
  
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>');
  
  // Bold: **bold**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *italic* or _italic_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">$1</a>');
  
  // New lines
  html = html.replace(/\n/g, '<br>');
  
  return html;
}
