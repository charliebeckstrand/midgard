/**
 * Hannou disabled: dormant state. Dims the element and animates the
 * opacity transition. `cursor-not-allowed` lives separately in
 * `cursor.ts`; compose both or either independently.
 *
 * `host` is the form for a box that dims through the native control inside
 * it, such as the box of a checkbox, a radio, or a switch. The control is a
 * native `<input>`, so the box reads `:disabled` (`has-disabled`). The box
 * takes the cursor too, because the reader points at the box and not at the
 * hidden input. A frame whose affixes can be disabled apart from its control
 * reads only its direct child (`kasane.layers`), so a disabled affix button
 * does not dim the frame.
 *
 * Layer: kiso · Concern: disabled state
 */

import { ugoki } from '../ugoki'

const { css } = ugoki

const base = [
	'disabled:opacity-50 data-disabled:opacity-50 group-disabled:opacity-50',
	css.opacity,
	css.duration,
]

/** A box that dims through the native control inside it. */
const host = ['has-disabled:opacity-50 has-disabled:cursor-not-allowed', css.opacity, css.duration]

export const disabled = {
	/** Dims the element when it is disabled, in each spelling of disabled. */
	base,
	/** Dims a box when the native control inside it is disabled. */
	host,
} as const
