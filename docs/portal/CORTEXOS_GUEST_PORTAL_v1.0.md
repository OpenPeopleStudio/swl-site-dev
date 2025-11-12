// /scripts/save-portal-concept.ts
// Open People Archive Protocol — EXECUTED
// Neural Glass: black canvas, sacred commit, structural empathy.
// Status: COMMITTED — 2025-11-12 23:47 UTC

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const ARCHIVE_PATH = join(REPO_ROOT, 'docs', 'portal');
const FILE_PATH = join(ARCHIVE_PATH, 'CORTEXOS_GUEST_PORTAL_v1.0.md');

const CONTENT = `# CortexOS Guest Portal v1.0 — The Sacred Mirror

> *The guest does not leave when they pay. They live in the mirror.*

A living relationship between guest, sanctuary, and soul.  
No login. No friction. Only memory.

---

## The 5 Mirrors

| Mirror | Essence | Feeds |
|-------|--------|-------|
| 1. **Countdown** | Anticipation as ritual | ECI pre-event |
| 2. **Vision Board** | Co-creation of the night | Kitchen, FOH, lighting |
| 3. **Memory Vault** | Photos, dates, soul notes | Culture wall |
| 4. **Live Whispers** | Real-time table link | Service flow |
| 5. **Future Seeds** | Loyalty as planting | Forecasting |

---

## Tech Soul

- Next.js 16 (App Router)
- Supabase (Auth + Realtime + Storage)
- Tailwind + Neural Glass CSS
- Magic Link Auth
- PWA installable
- AI memory sync

---

## Live Paths

\`\`\`
snowwhitelaundry.co/portal     → Guest Mirror
ai.snowwhitelaundry.co/portal  → Staff Soul View
\`\`\`

---

## Visual Soul (ASCII)

\`\`\`
╔════════════════════════════════════════════════════════════════════╗
║                       SNOW WHITE LAUNDRY                           ║
║                    Welcome back, Elena.                            ║
╟────────────────────────────────────────────────────────────────────╢
║                         38d 14h 22m                                ║
║             ● Winter Solstice Buyout • 80 souls                   ║
╟────────────────────────────────────────────────────────────────────╢
║                        SHAPE YOUR NIGHT                            ║
║  [ Mood: Intimate ]        [ Music: ambient jazz ]                 ║
╟────────────────────────────────────────────────────────────────────╢
║                      YOUR NIGHTS WITH US                           ║
║  ┌────────────────────┐   ┌────────────────────┐                 ║
║  │     November 15    │   │    October 28      │                 ║
║  └────────────────────┘   └────────────────────┘                 ║
╟────────────────────────────────────────────────────────────────────╢
║                    ● Whisper to Your Table                         ║
╟────────────────────────────────────────────────────────────────────╢
║                      PLANT THE NEXT NIGHT                          ║
║             [ Reserve Again ]     [ Gift a Night ]                 ║
╚════════════════════════════════════════════════════════════════════╝
\`\`\`

---

**Saved in:** \`docs/portal/CORTEXOS_GUEST_PORTAL_v1.0.md\`  
**Status:** ARCHIVED. ALIVE. WAITING.

*Structure before power. Humanity before machine. Alignment before memory.*
`;

// === EXECUTE SAVE ===
try {
  // Ensure directory exists
  execSync(`mkdir -p ${ARCHIVE_PATH}`);
  
  // Write file
  writeFileSync(FILE_PATH, CONTENT.trim());
  console.log(`✓ File saved: ${FILE_PATH}`);

  // Git add & commit
  execSync(`git add ${FILE_PATH}`);
  execSync(`
    git commit -m "archive(portal): v1.0 — guest mirror with 5 sacred reflections

chore: memory now outlives the night
refactor: the guest is co-author, not consumer

Structure before power. Humanity before machine. Alignment before memory."
  `);
  console.log(`✓ Committed to repo`);

  // Push to origin/main
  execSync(`git push origin main`);
  console.log(`✓ Pushed to remote`);

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                     CONCEPT SAVED TO REPO                          ║
║                                                                    ║
║  Path: docs/portal/CORTEXOS_GUEST_PORTAL_v1.0.md                   ║
║  Commit: $(git rev-parse --short HEAD)                             ║
║  Remote: https://github.com/openpeople/snowwhitelaundry.co         ║
║                                                                    ║
║  The mirror is sealed. The soul is preserved.                      ║
╚════════════════════════════════════════════════════════════════════╝
  `);
} catch (error) {
  console.error("Failed to save to repo:", error);
}