/**
 * Box kata: the unit of `<Box>`. The `base` slot is the box, with the
 * `radius`, `bg`, and `outline` axes and the responsive padding axes `p`,
 * `px`, and `py`. Each axis is unset by default, so an omitted token gives no
 * class.
 */
import { defineKata } from '../../core/recipe'
import { kasane, ma, omote, sen } from '../kiso'

const { bg, popover } = omote
const { outline } = sen

/** The background surface of each `bg` token. */
const surfaces = {
	none: 'bg-transparent',
	surface: bg.surface,
	tint: bg.tint,
	popover,
}

/** Background surface token for {@link Box}. */
export type BoxBg = keyof typeof surfaces

/** Border-radius token for {@link Box}. */
export type BoxRadius = keyof typeof kasane.rounded

export const k = defineKata({
	radius: kasane.rounded,
	bg: surfaces,
	// `true` selects the default weight, and a name selects another weight.
	outline: { true: outline.default, false: '', subtle: outline.subtle, strong: outline.strong },
	responsive: { p: ma.p, px: ma.px, py: ma.py },
})
