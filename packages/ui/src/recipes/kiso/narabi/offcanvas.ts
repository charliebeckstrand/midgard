/**
 * Narabi offcanvas: the display of a part that shows in one offcanvas layout
 * only, keyed by the layout and by the display that the part takes there. A
 * unit gives a table to its responsive `layout` axis, so the part shows at the
 * same breakpoints as the panel of the layout.
 *
 * Layer: kiso · Concern: offcanvas display
 */

/** The classes of a part for each offcanvas layout: in a `drawer`, or `inline`. */
export type ByLayout = Record<'drawer' | 'inline', string>

export const offcanvas = {
	/** A part that shows in the drawer layout only, such as a trigger of the drawer. */
	drawer: {
		block: { drawer: 'block', inline: 'hidden' },
		inlineFlex: { drawer: 'inline-flex', inline: 'hidden' },
	},
	/** A part that shows in the inline layout only, such as the inline panel. */
	inline: {
		block: { drawer: 'hidden', inline: 'block' },
		flex: { drawer: 'hidden', inline: 'flex' },
		inlineFlex: { drawer: 'hidden', inline: 'inline-flex' },
	},
} as const satisfies Record<string, Record<string, ByLayout>>
