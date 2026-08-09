import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, narabi, sen } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi
const { focus } = sen

const bubble = defineRecipe({
	base: [
		'w-fit max-w-[85%]',
		'px-4 py-3',
		size.md,
		'rounded-2xl',
		'whitespace-pre-wrap break-words',
	],
	role: {
		user: ['bg-blue-600 text-white', 'rounded-br-md'],
		assistant: [
			...mode('bg-zinc-200 text-zinc-950', 'dark:bg-white/10 dark:text-white'),
			'rounded-bl-md',
		],
		system: [size.md, ...text.muted, 'bg-transparent px-0'],
	},
	// One state, one place. The pointer reports the wait the pulse reports to the
	// eye: `progress` rather than `wait`, because the page stays live — the
	// composer still takes a draft, and `stop` still aborts. The cursor sits on
	// the bubble, so an actions-rail control keeps its own.
	//
	// The pulse rides the content, so the bubble projects it onto the Markdown
	// child rather than the component applying it — the axis then carries the
	// whole streaming look, and a caller composing custom slots off
	// `ChatMessageBubbleVariants` gets all of it. Written out because Tailwind
	// scans source for whole class names and never sees an assembled one; the
	// gate is `ugoki.css.pulse`'s. For the reduced-motion reader a standing dim
	// stands in, never both, since the pulse already troughs to that opacity —
	// the pointer affordance alone would leave a keyboard reader nothing.
	streaming: {
		true: [
			'cursor-progress',
			'[&>[data-slot=markdown]]:motion-safe:animate-pulse',
			'[&>[data-slot=markdown]]:motion-reduce:opacity-50',
		],
		false: '',
	},
	defaults: { role: 'assistant', streaming: false },
})

/**
 * A step the assistant took, drawn inside the bubble: the box, its head, and
 * the parts of that head.
 *
 * A fragment map rather than six `tool*` slots, because the pieces only ever
 * appear together and a flat list of them reads as six unrelated axes. It also
 * makes `name` expressible — a top-level slot cannot take that name, since it
 * collides with the recipe function's own `name`, and nesting puts it on a
 * plain object where it is just a key.
 *
 * Nothing here sets a foreground colour. The bubble's fill differs by speaker,
 * and a neutral that clears AA against one does not clear it against another —
 * the defect the embed fallback shipped with. The rule rides `currentColor` at
 * a low alpha, and the summary de-emphasizes by weight and truncation instead.
 */
const tool = {
	base: ['rounded-xl border border-current/20 px-3 py-2'],
	head: [flex.row, 'w-full items-center gap-2 text-left', size.sm],
	// A disclosure head is a button: give it the pointer and the package's own
	// focus ring rather than the UA outline. `inset` and not `ring`, because the
	// step is a bordered box — the case `sen.focus`'s own doc names for it, and
	// the reason `Collapse`'s bare trigger takes the outset one instead.
	//
	// The colour reset is load-bearing. The collapse kata paints its trigger
	// `text.muted` with a `fg.hover`, which is right on the page and wrong in
	// here for the third time in this file: zinc-500 on the assistant bubble's
	// fill is 3.8:1. These classes land after the collapse kata's, so the head
	// goes back to inheriting the bubble — hover included, or the pointer would
	// walk it into a fixed neutral on the user bubble's blue.
	trigger: ['cursor-pointer rounded-lg', 'text-inherit hover:text-inherit', focus.inset],
	name: [weight.semibold],
	summary: ['min-w-0 flex-1 truncate font-normal'],
	details: ['mt-2', size.sm],
} as const

export const k = defineRecipe(
	{
		base: flex.col,
		role: {
			user: 'items-end',
			assistant: 'items-start',
			system: 'items-center',
		},
		slots: {
			timestamp: [size.xs, 'mt-1', ...text.muted],
			actions: ['mt-1', flex.row, 'gap-0.5'],
			// A bubble of parts stacks one block per part, and each block collapses
			// its own outer margins, so the gap between two of them is this slot's.
			// It matches the markdown kata's `my-3` paragraph rhythm, so prose split
			// across two parts reads as prose split across two paragraphs. Carried by
			// every part after the first, because the first sits flush.
			part: 'mt-3',
			// The embed's own box holds no look — the registered renderer draws a
			// chart, a grid, or a map, and dictating a border or a fill here would
			// fight it. It only refuses to push the bubble wider than the bubble is.
			embed: 'max-w-full',
			// The line a block draws when no renderer claims its name. Quiet, because
			// it reports a gap rather than an error the reader can act on — but quiet
			// by slant, never by colour. `text.muted` is `onSurface.zinc`, which
			// clears AA against the page and the card and says nothing about a tinted
			// bubble: it lands at 3.8:1 on the assistant fill and worse on the user
			// bubble's blue. This inherits the bubble's foreground instead, the same
			// bargain the markdown kata takes, so the line reads on all four bubbles.
			embedFallback: [size.md, 'italic'],
		},
		defaults: { role: 'assistant' },
	},
	{ bubble, tool },
)

/** Recipe variant props for {@link ChatMessage} — the styling axes its kata exposes (`role`), for consumers composing custom slots. */
export type ChatMessageVariants = VariantProps<typeof k>
/** Recipe variant props for the {@link ChatMessage} bubble — its styling axes (`role`, `streaming`), for consumers composing custom slots. */
export type ChatMessageBubbleVariants = VariantProps<typeof bubble>
