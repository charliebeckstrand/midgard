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
		// Active conversation: a persistent wash, distinct from the transient hover
		// tint, marked by `data-current` on the row.
		...mode('data-current:bg-zinc-950/5', 'dark:data-current:bg-white/10'),
		// Keyboard focus projects onto the whole item: when the inner select control
		// is focus-visible the ring wraps the entire row, not just the text region.
		// Action controls keep their own ring, so roving into them reads distinctly.
		'ring-inset',
		'has-[[data-slot=chat-list-item-select]:focus-visible]:ring-2 has-[[data-slot=chat-list-item-select]:focus-visible]:ring-blue-600',
	],
	slots: {
		// The selectable region (title over preview); the component renders it as a
		// `<button>` when `onSelect` is set, a plain `<span>` otherwise. Affixes
		// (timestamp, actions) sit beside it so a focusable control never nests
		// inside the select button. Its ring is suppressed — the row draws it.
		select: [flex.col, 'min-w-0 flex-1', 'text-left', 'outline-none'],
		title: ['truncate', 'font-medium', size.sm, ...mode('text-zinc-950', 'dark:text-white')],
		preview: ['truncate', size.xs, ...text.muted],
		timestamp: ['shrink-0', size.xs, ...text.muted],
		actions: ['shrink-0', flex.row, 'gap-0.5'],
	},
})

/** Recipe variant props for {@link ChatListItem} — the styling axes its kata exposes, for consumers composing custom slots. */
export type ChatListItemVariants = VariantProps<typeof k>
