/**
 * Hannou nav: nav-item chrome shared by `kata/nav` and `kata/sidebar`.
 * The row (`<li>`) owns the painted surface — hover tint, text colour,
 * and a focus indicator driven by the inner control's `:focus-visible`
 * via `:has()`, so the ring wraps the whole row while sibling action
 * buttons ring only themselves. `navInner` is the matching content
 * strip: the real `<button>`/`<a>`, lifted above the active indicator,
 * growing to fill the row so the hit area covers everything except
 * action/affix islands.
 *
 * Layer: kiso · Concern: nav-item interaction surface
 */

import { mode } from '../../../core/recipe'
import { narabi } from '../narabi'

const { flex } = narabi

export const nav = [
	...mode('hover:bg-zinc-950/5', 'dark:hover:bg-white/5'),
	...mode('text-zinc-950', 'dark:text-white'),
	// Suffix match covers both `sidebar-item-inner` and `nav-item-inner`;
	// Tailwind scans whole literals, so the slot can't be interpolated.
	'ring-inset',
	'has-[[data-slot$=item-inner]:focus-visible]:ring-2',
	'has-[[data-slot$=item-inner]:focus-visible]:ring-blue-600',
]

export const navInner = [
	'relative',
	'z-10',
	flex.row,
	'min-w-0',
	'flex-1',
	'text-left',
	'outline-none',
]
