/**
 * Hannou disabled — dormant state. Dims the element and animates the
 * opacity transition. `cursor-not-allowed` lives separately in
 * `cursor.ts` so consumers can pick state without picking pointer
 * feedback.
 *
 * Layer: kiso · Concern: disabled state
 */

import { ugoki } from '../ugoki'

const { css } = ugoki

export const disabled = [
	'disabled:opacity-50 data-disabled:opacity-50 group-disabled:opacity-50',
	css.opacity,
	css.duration,
]
