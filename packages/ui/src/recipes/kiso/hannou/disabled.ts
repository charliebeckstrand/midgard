/**
 * Hannou disabled: dormant state. `base` dims the element at once, with no
 * opacity transition. WebKit draws an element on a layer of its own while its
 * opacity transitions, and it snaps that layer to a different device pixel
 * than the page. Thus an element at a fractional offset moves by a part of a
 * pixel for the length of the fade, and then moves back. A disabled button
 * beside an enabled one shows this most, such as the zoom buttons of a map.
 * `base` sets no cursor: `cursor-not-allowed` lives in `cursor.ts`.
 *
 * `host` is the form for a box that dims through the native control inside
 * it, such as the box of a checkbox, a radio, or a switch. The control is a
 * native `<input>`, so the box reads `:disabled` (`has-disabled`). The box
 * takes the cursor too, because the reader points at the box and not at the
 * hidden input. The box of a checked control dims on hover too, and that dim
 * also shows at once. A frame whose affixes can be disabled apart from its
 * control reads only its direct child (`kasane.layers`), so a disabled affix
 * button does not dim the frame.
 *
 * Layer: kiso · Concern: disabled state
 */

const base = ['disabled:opacity-50 data-disabled:opacity-50 group-disabled:opacity-50']

/** A box that dims through the native control inside it. */
const host = 'has-disabled:opacity-50 has-disabled:cursor-not-allowed'

export const disabled = {
	/** Dims the element when it is disabled, in each spelling of disabled. */
	base,
	/** Dims a box when the native control inside it is disabled. */
	host,
} as const
