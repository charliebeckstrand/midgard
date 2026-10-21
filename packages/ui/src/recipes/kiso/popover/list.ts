/**
 * Popover archetype: list. The panel of options that Listbox and Combobox
 * share, so the one dropdown family has one height.
 *
 * Layer: kiso · Archetype: popover · Concern: list
 */

import { fit } from './fit'
import { portal } from './portal'

export const list = {
	/** The positioned wrapper of the panel. */
	portal: [portal, fit.wrapper],
	/**
	 * The scroll region of the options. The cap is 320px, about eight rows. The
	 * old 240px (the classic Tailwind example value, never a reasoned one) forced
	 * a scrollbar at seven options, and the dashboard picker hit it with screen to
	 * spare. The cap binds only on a list that exceeds it. A panel that no longer
	 * fits below its trigger flips above, and a panel that fits on neither side
	 * shrinks into the larger space (the floating middleware chain).
	 */
	options: ['max-h-80', fit.scroll],
} as const
