/**
 * Menu kata: object-literal surface for `<Menu>` / `<Dropdown>` popover lists.
 * The `item` sub-recipe carries the density- and size-axed option row; the rest
 * are static slots — `content` (the panel box), `section`, `heading`, `label`,
 * `description`, `shortcut`, and the `separator` divider.
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

// Native overlay scrollbars (macOS, iOS) stay hidden until the user scrolls,
// so a menu clipped by `max-h` reads as complete — the overflow items look
// missing, not scrollable. Styling the scrollbar opts WebKit/Blink into a
// classic always-on bar, and a non-default `scrollbar-color` does the same in
// Firefox; either way it shows whenever the list overflows. Thumb colours
// mirror `kata/scroll-area`'s thumb.
const scrollbar = [
	'[scrollbar-width:thin]',
	'[scrollbar-color:rgb(9_9_11_/_0.2)_transparent]',
	'dark:[scrollbar-color:rgb(255_255_255_/_0.2)_transparent]',
	'[&::-webkit-scrollbar]:w-2',
	'[&::-webkit-scrollbar-track]:bg-transparent',
	'[&::-webkit-scrollbar-thumb]:rounded-full',
	'[&::-webkit-scrollbar-thumb]:bg-zinc-950/20',
	'[&::-webkit-scrollbar-thumb:hover]:bg-zinc-950/30',
	'dark:[&::-webkit-scrollbar-thumb]:bg-white/20',
	'dark:[&::-webkit-scrollbar-thumb:hover]:bg-white/30',
]

export const k = {
	content: ['min-w-48', 'max-h-60', ...scrollbar],
	item,
	section: 'first:pt-0 last:pb-0',
	heading: ['px-3 pb-1 pt-2', size.xs, weight.medium, text.muted],
	label: 'truncate',
	description: [description, text.muted, 'group-focus/option:text-white'],
	shortcut: 'ml-auto',
	separator: divider.top,
} as const
