/**
 * Offcanvas kata: the classes of a part that shows in one offcanvas layout
 * only, keyed by the layout and by the display that the part takes there. A
 * component resolves a table against its `layout` with `resolveVariant`, so
 * the part shows at the same breakpoints as the panel of the layout.
 */
import type { OffcanvasLayout } from '../../hooks/use-offcanvas'

type ByLayout = Record<OffcanvasLayout, string>

export const k = {
	/** A part that shows in the drawer layout only, such as a trigger of the drawer. */
	drawer: {
		block: { drawer: 'block', inline: 'hidden' },
	},
	/** A part that shows in the inline layout only, such as the inline panel. */
	inline: {
		block: { drawer: 'hidden', inline: 'block' },
		flex: { drawer: 'hidden', inline: 'flex' },
		inlineFlex: { drawer: 'hidden', inline: 'inline-flex' },
	},
} as const satisfies Record<string, Record<string, ByLayout>>
