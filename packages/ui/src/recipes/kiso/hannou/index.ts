/**
 * Hannou (反応) — response. Interaction feedback — hover, press, focus,
 * disabled (dormant), cursor — plus the kata-shaped item / nav surfaces
 * that compose those primitives. One file per concern; this barrel
 * assembles the named bundle that every kata reads.
 */

import { cursor } from './cursor'
import { item } from './item'
import { nav } from './nav'
import { disabled } from './state'
import { text } from './text'

export const hannou = {
	item,
	nav,
	/** Disabled / dormant state. */
	disabled,
	/** Cursor feedback — pointer when interactive, not-allowed when disabled. */
	cursor,
	/** Text-colour feedback on hover / focus / disabled / current. */
	text,
}
