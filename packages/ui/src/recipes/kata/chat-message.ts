import { defineKata, mode, type VariantProps } from '../../core/recipe'
import { dan, iro, ji, kokkaku, narabi, sen } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi
const { focus } = sen

const bubble = {
	base: [
		// The cap is 85% of the message, with a floor of 12rem, and never more than
		// the full message. A shrink-to-fit parent (an inline-flex box, an auto grid
		// column, a popover) takes its width from the bubble's text, and 85% of that
		// is narrower than the text. Without the floor, a short bubble then breaks
		// inside a word.
		'w-fit max-w-[min(100%,max(85%,--spacing(48)))]',
		'px-4 py-3',
		size.md,
		'rounded-2xl',
		// `anywhere`, not `break-word`: a long word, such as a URL, then does not set
		// the min-content width. In a flex or grid host, the message would
		// otherwise grow to the full word.
		'whitespace-pre-wrap wrap-anywhere',
	],
	sender: {
		user: ['bg-blue-600 text-white', 'rounded-ee-md'],
		assistant: [
			...mode('bg-zinc-200 text-zinc-950', 'dark:bg-white/10 dark:text-white'),
			'rounded-es-md',
		],
		system: [...text.muted, 'bg-transparent px-0'],
	},
	// One state, one place. The pointer reports the wait the pulse reports to the
	// eye: `progress` rather than `wait`, because the page stays live (the
	// composer still takes a draft, and `stop` still aborts). The cursor sits on
	// the bubble, so an actions-rail control keeps its own.
	//
	// The pulse rides the content, so the bubble projects it onto the Markdown
	// child rather than the component applying it: the axis then carries the
	// whole streaming look. Written out because Tailwind
	// scans source for whole class names and never sees an assembled one; the
	// gate is `ugoki.css.pulse`'s. For the reduced-motion reader a standing dim
	// stands in, never both, since the pulse already troughs to that opacity:
	// the pointer affordance alone would leave a keyboard reader nothing.
	streaming: {
		true: [
			'cursor-progress',
			'[&>[data-slot=markdown]]:motion-safe:animate-pulse',
			'[&>[data-slot=markdown]]:motion-reduce:opacity-50',
		],
		false: '',
	},
}

export const k = defineKata({
	base: flex.col,
	sender: {
		user: 'items-end',
		assistant: 'items-start',
		system: 'items-center',
	},
	slots: {
		bubble,
		timestamp: [size.xs, 'mt-1', ...text.muted],
		actions: ['mt-1', flex.row, 'gap-0.5'],
		// A bubble of parts stacks one block per part, and each block collapses
		// its own outer margins, so the gap between two of them is this slot's.
		// It matches the markdown kata's `my-3` paragraph rhythm, so prose split
		// across two parts reads as prose split across two paragraphs. Carried by
		// every part after the first, because the first sits flush.
		part: 'mt-3',
		// The embed's own box holds no look: the registered renderer draws a
		// chart, a grid, or a map, and dictating a border or a fill here would
		// fight it. It only refuses to push the bubble wider than the bubble is.
		embed: {
			base: 'max-w-full',
			slots: {
				// The line a block draws when no renderer claims its name. Quiet, because
				// it reports a gap rather than an error the reader can act on, but quiet
				// by slant, never by color. `text.muted` is `onSurface.zinc`, which
				// clears AA against the page and the card and says nothing about a tinted
				// bubble: it lands at 3.8:1 on the assistant fill and worse on the user
				// bubble's blue. This inherits the bubble's foreground instead, the same
				// bargain the markdown kata takes, so the line reads on all four bubbles.
				fallback: [size.md, 'italic'],
				// The shape that holds the space of a held-back embed, as wide as the bubble.
				placeholder: kokkaku.chat.embed,
			},
		},
		/**
		 * A step the assistant took, drawn inside the bubble: the `tool` box, its
		 * head, and the parts of that head.
		 *
		 * Nothing here sets a foreground color. The bubble's fill differs by
		 * speaker, and a neutral that clears AA against one does not clear it
		 * against another. That is the defect the embed fallback shipped with. The
		 * rule rides `currentColor` at a low alpha, and the summary de-emphasizes by
		 * weight and truncation instead.
		 */
		tool: {
			base: ['rounded-xl border border-current/20 px-3 py-2'],
			slots: {
				head: [flex.row, `w-full items-center ${dan.gap.scale.sm} text-start`, size.sm],
				// A disclosure head is a button: give it the pointer and the package's own
				// focus ring rather than the UA outline. `inset` and not `ring`, because the
				// step is a bordered box: the case `sen.focus`'s own doc names for it, and
				// the reason `Collapse`'s bare trigger takes the outset one instead.
				//
				// The color reset is load-bearing. The collapse kata paints its trigger
				// `text.muted` with a `fg.hover`, which is right on the page and wrong in
				// here for the third time in this file: zinc-500 on the assistant bubble's
				// fill is 3.8:1. These classes land after the collapse kata's, so the head
				// goes back to inheriting the bubble: hover included, or the pointer would
				// walk it into a fixed neutral on the user bubble's blue.
				trigger: ['cursor-pointer rounded-lg', 'text-inherit hover:text-inherit', focus.inset],
				label: [weight.semibold],
				summary: ['min-w-0 flex-1 truncate', weight.normal],
				details: ['mt-2', size.sm],
			},
		},
	},
	defaults: { sender: 'assistant', streaming: false },
})

/**
 * Recipe variant props for {@link ChatMessage}: the styling axes its kata exposes (`sender`), for consumers composing custom slots.
 * The `streaming` axis of the bubble is a prop of the message, with its own description.
 */
export type ChatMessageVariants = Omit<VariantProps<typeof k>, 'sender' | 'streaming'> & {
	/** The author of the message, which sets the side that the message aligns to. @defaultValue 'assistant' */
	sender?: VariantProps<typeof k>['sender']
}
