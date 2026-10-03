/**
 * Sidebar layout kata: the kiso tokens of `layouts/sidebar`. The layout keeps
 * its recipes in its own `variants.ts`, and this kata is the one path from that
 * file to kiso. It is not the kata of the Sidebar component (`kata/sidebar.ts`).
 */
import { omote, sen, sou } from '../kiso'
import { dan } from '../kiso/dan'

const { shell, shellX, shellBottom, shellTopLarge, shellTopNoHeader } = dan.space

export const k = {
	/** The surface of the content region: flat below `lg`, a card from `lg` up. */
	content: omote.content,
	/** The focus ring of the body, inset, because the body fills its region. */
	focus: sen.focus.inset,
	/** The stacking rung of the floating buffer, which is portaled to the body. */
	chrome: sou.chrome,
	/** The padding steps of the regions, which follow the nearest density scope. */
	space: { shell, shellX, shellBottom, shellTopLarge, shellTopNoHeader },
} as const
