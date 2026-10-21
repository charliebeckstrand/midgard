/**
 * Hannou busy: the state of a part that waits on data. The part pulses. For a
 * reader who asked for less motion, a standing dim takes the place of the
 * pulse. It is never both. The pulse already falls to that opacity, and a
 * static dim stops the pulse, because the keyframe sets only its midpoint.
 *
 * Layer: kiso · Concern: busy state
 */

import { ugoki } from '../ugoki'

const { css } = ugoki

export const busy = [css.pulse, 'motion-reduce:opacity-50']
