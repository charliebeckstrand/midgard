/**
 * Tabs kata: serves both the underline `<Tabs>` list and the `<Segment>` box,
 * two units through one surface. Orientation-/size-axed sub-recipes (`group`,
 * `list`, `tab`, `indicator`, `wrapper`, `trigger`) build the underline tabs;
 * `segment` bridges the shared segment recipe, and `skeleton` carries a loading
 * placeholder for each unit.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { bridge } from '../katakana'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'
import { segment } from '../kiso/segment'

const { cursor, disabled, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, focus } = sen

/** Tab-group root: stacks the list and panels, swapping axis with orientation. */
const group = defineRecipe({
	base: ['flex gap-4'],
	orientation: {
		horizontal: 'flex-col',
		vertical: 'flex-row',
	},
	defaults: { orientation: 'horizontal' },
})

const list = defineRecipe({
	base: ['flex', ...border.subtleColor],
	orientation: {
		horizontal: ['gap-4', 'border-b'],
		vertical: ['flex-col', 'border-l'],
	},
	defaults: { orientation: 'horizontal' },
})

/**
 * Overflow viewport around the underline list: an over-long tab row scrolls
 * within it instead of widening the page. The cross axis stays clipped (the
 * active-indicator/focus rail sits flush with the content edge, so nothing is
 * lost), and the native scrollbar is hidden so it never crosses the rail — the
 * active tab scrolls into view and roving keeps every tab reachable.
 */
const scroll = defineRecipe({
	base: ['[scrollbar-width:none]', '[&::-webkit-scrollbar]:hidden'],
	orientation: {
		horizontal: 'overflow-x-auto overflow-y-hidden',
		vertical: 'overflow-y-auto overflow-x-hidden',
	},
	defaults: { orientation: 'horizontal' },
})

const tab = defineRecipe({
	base: [
		'relative',
		flex.row,
		'gap-2',
		weight.medium,
		text.muted,
		fg.current,
		// Tab-specific intermediate hover on non-current siblings.
		...mode(
			'not-data-current:not-disabled:hover:text-zinc-700',
			'dark:not-data-current:not-disabled:hover:text-zinc-200',
		),
		focus.indicator,
		...disabled,
		'outline-none',
		...cursor,
		'after:absolute after:rounded-full',
		'after:bg-transparent',
		'focus-visible:after:bg-blue-500',
	],
	orientation: {
		horizontal: ['after:inset-x-0 after:-bottom-px after:h-0.5'],
		vertical: ['after:inset-y-0 after:-left-px after:w-0.5'],
	},
	size: {
		sm: size.sm,
		md: size.md,
		lg: size.lg,
	},
	compound: [
		{ orientation: 'horizontal', size: 'sm', class: 'px-1 pb-3' },
		{ orientation: 'horizontal', size: 'md', class: 'px-1 pb-4' },
		{ orientation: 'horizontal', size: 'lg', class: 'px-1 pb-5' },
		{ orientation: 'vertical', size: 'sm', class: 'px-3 py-1.5' },
		{ orientation: 'vertical', size: 'md', class: 'px-4 py-2' },
		{ orientation: 'vertical', size: 'lg', class: 'px-5 py-2.5' },
	],
	defaults: { orientation: 'horizontal', size: 'md' },
})

const indicator = defineRecipe({
	base: [rounded.full, ...mode('bg-zinc-950', 'dark:bg-white')],
	orientation: {
		horizontal: 'inset-x-0 -bottom-px top-auto h-0.5',
		vertical: 'inset-y-0 -left-px right-auto w-0.5',
	},
	defaults: { orientation: 'horizontal' },
})

/** Positioning wrapper around each trigger; hosts the active indicator. */
const wrapper = defineRecipe({
	base: ['group relative'],
	stretch: { true: 'flex-1', false: '' },
	defaults: { stretch: false },
})

/** Shared trigger chrome layered over the `tab` / `segment.item` surface. */
const trigger = defineRecipe({
	base: ['relative z-1'],
	stretch: { true: 'w-full justify-center', false: '' },
	defaults: { stretch: false },
})

export const k = {
	group,
	list,
	scroll,
	tab,
	wrapper,
	trigger,
	indicator,
	segment: bridge.segment(segment),
	// Two units flow through this kata: the underline tab list and the
	// segment box behind `<Segment>`.
	skeleton: {
		tab: kokkaku.tabs.tab,
		segment: kokkaku.segment,
	},
} as const
