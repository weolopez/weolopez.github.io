/* aaron/system.js — assembles the agent's system prompt from persona parts.
   Edit or swap files in persona/ to experiment with different behaviors.

   IDENTITY is the one part Aaron writes itself. buildSystem() reads the live
   record from the persona store on every call, so an identity_update takes
   effect on the very next send with no reload. Everything else stays a static
   import: SUBCONSCIOUS, PLANNING and SKILLS describe how the loop works, not
   who Aaron is, and are not Aaron's to rewrite.

   SUBCONSCIOUS is deliberately its own part rather than a section of IDENTITY,
   and the reason is mechanical, not editorial: identity_update REPLACES the
   entire identity text, ungated and by design. A background-layer instruction
   living inside it would be wiped by the first self-edit that forgot to carry
   it forward — silently, with nothing to notice it by. Keeping it separate
   means the layer survives Aaron rewriting who it is, which is the point:
   how the mind is arranged is not the same question as who is doing the
   thinking.

   The static IDENTITY constant remains the floor. A fresh browser, a signed-out
   visitor, or cleared storage gets it unchanged — so the page is never left
   without an identity just because nothing has been written yet. */

import { IDENTITY } from './persona/identity.js?v=1';
import { SUBCONSCIOUS } from './persona/subconscious.js?v=2';
import { PLANNING } from './persona/planning.js';
import { SKILLS }   from './persona/skills.js';
import { RELOAD }   from './persona/reload.js';
import { loadIdentity } from './store.js';

// Never throws: a corrupt or absent record falls back to the static floor
// rather than leaving the prompt without its opening section.
export function identityText() {
  try {
    const t = loadIdentity()?.text;
    return typeof t === "string" && t.trim() ? t : IDENTITY;
  } catch {
    return IDENTITY;
  }
}

export const buildSystem = () => [identityText(), SUBCONSCIOUS, PLANNING, SKILLS, RELOAD].join('\n\n');

// The all-static assembly, kept as its own export: it is what the persona panel
// offers as "reset to default", and what a comparison against the live prompt
// is measured from.
export const SYSTEM = [IDENTITY, SUBCONSCIOUS, PLANNING, SKILLS, RELOAD].join('\n\n');
