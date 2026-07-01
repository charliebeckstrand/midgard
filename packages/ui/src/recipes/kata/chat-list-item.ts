import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi } from '../kiso'

const { nav, cursor } = hannou
const { text } = iro
const { size } = ji
const { gap, padding, radius } = kasane
const { flex } = narabi

export const k = defineRecipe({
	base: [
		'group relative',
		// Inside a ChatList the row is an `<li>`; drop the list marker.
		'list-none',
		flex.row,
		'items-center',
		'w-full',
		gap.g('2'),
		padding.p('2'),
		radius.r('2'),
		...cursor,
		nav.tint,
		// Keyboard focus projects onto the whole item: when the inner select control
		// is focus-visible the ring wraps the entire row, not just the text region.
		// Action controls keep their own ring, so roving into them reads distinctly.
		'ring-inset',
		'has-[[data-slot=chat-list-item-select]:focus-visible]:ring-2 has-[[data-slot=chat-list-item-select]:focus-visible]:ring-blue-600',
	],
	slots: {
		// The selectable region (title, preview, and — when shown — timestamp,
		// stacked in that order); the component renders it as a `<button>` when
		// `onSelect` is set, a plain `<span>` otherwise. `actions` sit beside it
		// so a focusable control never nests inside the select button. Its ring is
		// suppressed — the row draws it. The pointer cursor is restated here: a
		// `<button>` resets it over its own box. `z-10` alone (no `relative`) lifts it
		// above the active indicator: flex items get a stacking context from
		// `z-index` even while `position: static`, and staying static leaves the row
		// as the sole positioned ancestor for the overlay `::after` below — giving the
		// button `relative` here would make it that pseudo-element's containing block
		// instead, shrinking the overlay down to the button's own `flex-1` box.
		select: [flex.col, 'min-w-0 flex-1', 'text-left', 'outline-none', 'z-10', ...cursor],
		// Stretches the select button's hit area over the whole `relative` row via a
		// pointer-capturing `::after` (the inverse of `layers.overlay`, which adds
		// `pointer-events-none` to *stop* this). The button only spans `flex-1`, so
		// without this the padding, gap, and actions chrome wouldn't select. Applied
		// to the `<button>` branch only — a static `<span>` has nothing to trigger.
		overlay: ['after:absolute after:inset-0'],
		title: ['truncate', 'font-medium', size.md, ...mode('text-zinc-950', 'dark:text-white')],
		preview: ['truncate', size.sm, ...text.muted],
		// Third line under the preview, shown per `timestamp`'s `show`; nested
		// inside `select`, so it already sits above the active indicator.
		timestamp: ['truncate', size.xs, ...text.muted],
		// `relative z-10` lifts the action controls above the active indicator and the
		// select overlay so they stay clickable.
		actions: ['shrink-0', flex.row, 'gap-0.5', 'relative z-10'],
		// Focus projection for the active indicator: browsers paint the row's own
		// ring beneath the indicator's opaque fill (rings render with the element's
		// own layer, under positioned descendants), so the focused current row
		// re-draws the ring on the indicator itself — the topmost full-row surface.
		indicator: [
			'ring-inset',
			'group-has-[[data-slot=chat-list-item-select]:focus-visible]:ring-2 group-has-[[data-slot=chat-list-item-select]:focus-visible]:ring-blue-600',
		],
	},
})

/** Recipe variant props for {@link ChatListItem} — the styling axes its kata exposes, for consumers composing custom slots. */
export type ChatListItemVariants = VariantProps<typeof k>
