/**
 * Hannou state — disabled / dormant. Dims the element and animates the
 * opacity transition. `cursor-not-allowed` lives separately in
 * `cursor.ts` so consumers can pick state without picking pointer
 * feedback.
 *
 * Layer: kiso · Concern: interaction state
 */

import { ugoki } from '../ugoki'

export const disabled = [
	'disabled:opacity-50',
	'data-disabled:opacity-50',
	'group-disabled:opacity-50',
	ugoki.css.opacity,
	ugoki.css.duration,
]
