/**
 * Offcanvas kata: the unit of a part that shows in one offcanvas layout only,
 * for a component that has no unit of its own. The display that the part takes
 * nests under its layout: `drawer.block`, `inline.block`, and `inline.flex`.
 * `layout` is a responsive axis, so the part shows at the same breakpoints as
 * the panel of the layout. A unit of its own reads the tables of
 * `narabi.offcanvas`.
 */
import { defineKata } from '../../core/recipe'
import { narabi } from '../kiso'

const shows = narabi.offcanvas

export const k = defineKata({
	slots: {
		drawer: {
			slots: {
				block: { responsive: { layout: shows.drawer.block } },
			},
		},
		inline: {
			slots: {
				block: { responsive: { layout: shows.inline.block } },
				flex: { responsive: { layout: shows.inline.flex } },
			},
		},
	},
})
