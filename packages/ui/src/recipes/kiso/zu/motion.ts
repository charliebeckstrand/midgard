/**
 * Zu motion: the motion vocabulary for data-viz mount reveals. It is the shared
 * `mark` family plus the tempo primitives. Each module composes its own timing
 * spec from it (`chart-motion.ts`, `map-motion.ts`), so the reveals of the two
 * modules never drift.
 *
 * Layer: kiso · Archetype: zu · Concern: motion
 */

import { ugoki } from '../ugoki'

const { duration, ease, mark } = ugoki

export const motion = { mark, duration, ease } as const
