/**
 * Ugoki reveal: the tween of the crossfade from a placeholder to its content.
 * `<ReadyReveal>` writes its own targets and reads this tween.
 *
 * Layer: kiso · Concern: content reveal
 */

import { duration, ease } from './base'

export const reveal = { duration: duration[250], ease: ease.standard } as const
