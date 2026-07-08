/**
 * Menu kata: object-literal surface for `<Menu>` / `<Dropdown>` popover lists.
 * The `item` and `viewport` sub-recipes carry the density- and size-axed
 * option row and the capped scroll container; the rest are static slots —
 * `content` (the panel box), `section`, `heading`, `label`, `description`,
 * `shortcut`, and the `separator` divider.
 */
import { defineRecipe } from '../../core/recipe'
import { hannou, iro, ji, narabi, sen } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex, description } = narabi
const { divider } = sen

const item = defineRecipe({
	base: ['group/option', flex.row, 'w-full', ...hannou.item, ...narabi.item],
	// Padding and gap track the density axis; text tracks the size axis.
	// They move together under a diagonal `<Density>` and split when the axes
	// are set independently.
	density: {
		sm: 'gap-2 px-2.5 py-1',
		md: 'gap-3 px-3 py-1.5',
		lg: 'gap-3 px-3.5 py-2.5',
	},
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	defaults: { density: 'md', size: 'md' },
})

// The scrollable item region inside the panel. The max height is tuned per
// density to cut the last visible row roughly in half (assuming plain items on
// the diagonal density/size axis), so a clipped row — not just the edge fade —
// signals more content below.
const viewport = defineRecipe({
	base: [
		'space-y-0.5',
		'overflow-y-auto overscroll-contain',
		// The panel surface is translucent glass, so an overlay gradient has no
		// solid colour to fade into; a mask fades the scrolled content itself.
		// The fade extents default to zero and open per edge while
		// `useScrollOverflow` stamps the matching overflow attribute.
		'[mask-image:linear-gradient(to_bottom,transparent,black_var(--menu-fade-above,0px),black_calc(100%-var(--menu-fade-below,0px)),transparent)]',
		'data-overflow-above:[--menu-fade-above:1.5rem]',
		'data-overflow-below:[--menu-fade-below:1.5rem]',
	],
	density: {
		sm: 'max-h-48',
		md: 'max-h-52',
		lg: 'max-h-56',
	},
	defaults: { density: 'md' },
})

export const k = {
	content: 'min-w-48',
	viewport,
	item,
	section: 'first:pt-0 last:pb-0',
	heading: ['px-3 pb-1 pt-2', size.xs, weight.medium, text.muted],
	label: 'truncate',
	description: [description, text.muted, 'group-focus/option:text-white'],
	shortcut: 'ml-auto',
	separator: divider.top,
} as const
