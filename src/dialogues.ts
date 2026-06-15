import { defaultDialogues } from './personas/default';
import { sarcasticDialogues } from './personas/sarcastic';
import { encouragingDialogues } from './personas/encouraging';
import { poeticDialogues } from './personas/poetic';
import { genzDialogues } from './personas/genz';
import { snarkyDialogues } from './personas/snarky';

export const PERSONA_AUTONOMOUS_DIALOGUES: Record<string, Record<string, string[]>> = {
  "default": defaultDialogues,
  "sarcastic": sarcasticDialogues,
  "encouraging": encouragingDialogues,
  "poetic": poeticDialogues,
  "genz": genzDialogues,
  "snarky": snarkyDialogues
};
