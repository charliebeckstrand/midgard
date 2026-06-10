/**
 * Hannou disabled: dormant state. Dims the element and animates the
 * opacity transition. `cursor-not-allowed` lives separately in
 * `cursor.ts`; compose both or either independently.
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
