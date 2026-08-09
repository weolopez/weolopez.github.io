/* aaron/system.js — assembles the agent's system prompt from persona parts.
   Edit or swap files in persona/ to experiment with different behaviors. */

import { IDENTITY } from './persona/identity.js';
import { PLANNING } from './persona/planning.js';
import { SKILLS }   from './persona/skills.js';

export const SYSTEM = [IDENTITY, PLANNING, SKILLS].join('\n\n');
