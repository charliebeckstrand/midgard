/**
 * Offcanvas kata: the unit of a part that shows in one offcanvas layout only,
 * for a component that has no unit of its own. Each slot is named by the layout
 * and by the display that the part takes there. `layout` is a responsive axis,
 * so the part shows at the same breakpoints as the panel of the layout. A unit
 * of its own reads the tables of `narabi.offcanvas`.
 */
import { defineKata } from '../../core/recipe'
import { narabi } from '../kiso'

const shows = narabi.offcanvas

export const k = defineKata({
	slots: {
		drawerBlock: { responsive: { layout: shows.drawer.block } },
		inlineBlock: { responsive: { layout: shows.inline.block } },
		inlineFlex: { responsive: { layout: shows.inline.flex } },
	},
})
