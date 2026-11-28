import { defineKata, mode, type VariantProps } from '../../core/recipe'
import { dan, iro, ji, kasane, kokkaku, narabi, omote, sen, ugoki } from '../kiso'

const { on, palette, text } = iro
const { rounded } = kasane
const { size } = ji
const { flex } = narabi
const { focus, forced, ring } = sen
const { css } = ugoki

// A row of controls, such as the branch switcher.
const controls = [flex.row, 'gap-0.5']

const bubble = {
	base: [
		// The padding and the radius of the skeleton bubble. The frame holds the
		// width cap, and the bubble fits in the frame.
		...kokkaku.chat.box,
		'w-fit max-w-full',
		// The Copy item of the menu moves the focus to the bubble. The ring shows
		// for a keyboard focus only, so a press of the pointer shows no ring.
		focus.ring,
		size.md,
		// `anywhere`, not `break-word`: a long word, such as a URL, then does not set
		// the min-content width. In a flex or grid host, the message would
		// otherwise grow to the full word.
		'whitespace-pre-wrap wrap-anywhere',
	],
	// Forced colors replace the fill, so a filled bubble keeps its edge as an
	// outline. The system line has no fill to lose.
	sender: {
		user: [palette.solid.blue, kokkaku.chat.tail.user, forced.outline],
		assistant: [
			...mode('bg-zinc-100 text-zinc-950', 'dark:bg-white/10 dark:text-white'),
			kokkaku.chat.tail.assistant,
			forced.outline,
		],
		system: [...text.muted, 'bg-transparent px-0'],
	},
	// One state, one place. The pointer reports the wait the dots after the
	// content report to the eye: `progress` rather than `wait`, because the page
	// stays live (the composer still takes a draft, and `stop` still aborts).
	// The cursor sits on the bubble, so an actions-rail control keeps its own.
	// The content does not pulse or dim: the reader reads the reply while it
	// streams, for many seconds, so the text keeps its full contrast (WCAG
	// 1.4.3).
	streaming: {
		true: 'cursor-progress',
		false: '',
	},
	// The message that the composer edits. A send replaces it, so a ring marks
	// it: the resting ring of `focus.virtual`, a 2px outline with a 2px gap. It
	// reads against the blue fill of the user bubble and against the page. A
	// dim would lower the text of the bubble below 4.5:1, and the ring keeps
	// the text at full contrast. Forced colors keep an outline.
	editing: {
		true: focus.virtual,
		false: '',
	},
}

export const k = defineKata({
	// The named group lets the toolbar show while the bubble is hovered, or
	// while focus is in the message.
	base: [flex.col, 'group/chat-message'],
	sender: {
		user: 'items-end',
		assistant: 'items-start',
		system: 'items-center',
	},
	// On a device that hovers, a message with a menu keeps 24px of room above
	// its bubble for the toolbar. The toolbar stays in the box of the message,
	// so a host that clips its overflow, such as a card or a scroll, does not
	// cut it. The room is the gap of a transcript row (`kokkaku.chat.row`), so a
	// message in a transcript adds none. A device with no hover has no toolbar,
	// so the message keeps no room there.
	menu: {
		true: '[@media(hover:hover)]:pt-6',
		false: '',
	},
	slots: {
		// The bubble and the row below it. The frame has the width of the skeleton
		// bubble, so the row is as wide as the bubble, and its start is the start
		// of the bubble. A row wider than a short bubble makes the frame wider, and
		// the bubble stays on the side of the speaker. The toolbar is placed
		// against the frame, so it follows the bubble, also when the bubble is in
		// the center of the row.
		frame: {
			base: [flex.col, 'relative', kokkaku.chat.width],
			sender: {
				user: 'items-end',
				assistant: 'items-start',
				system: 'items-center',
			},
		},
		bubble,
		// The row below the bubble: the "(edited)" label at the start, and the
		// branch switcher on the side of the speaker. It is quiet, as the
		// timestamp is.
		footer: {
			base: [flex.row, 'mt-1 gap-2 self-stretch', size.xs, ...text.muted],
			sender: {
				user: 'justify-end',
				assistant: 'justify-start',
				system: 'justify-center',
			},
		},
		// The label of a message that an edit sent or a revision changed. It takes
		// the start of the row, so the switcher stays on the side of the speaker.
		edited: 'me-auto',
		// The second line of an option of a choice ask. The description of a field
		// is `text.muted`, which is right on the page and wrong in a bubble:
		// zinc-500 on the assistant fill is 4.4:1. The wash rung clears 4.5:1 on
		// the fill in both modes, and keeps the step below the label.
		actionDescription: on.wash.muted,
		timestamp: [size.xs, 'mt-1', ...text.muted],
		// The switcher of a message with more than one branch. Its digits keep one
		// width, so `9 of 10` does not move its buttons.
		branch: [...controls, 'tabular-nums'],
		/**
		 * The frame of the toolbar of the message actions: it floats over the
		 * outer top corner of the bubble. That is the corner on the side of the
		 * speaker. A system line has no side, so the toolbar takes its start
		 * corner. The toolbar is never in the center, where it would cover the
		 * text that it acts on. The toolbar rises into the `menu` room, 24px
		 * above the frame. The toolbar is 34px high, because its buttons have a
		 * fixed size, so it overlaps the bubble by 10px: the padding of the
		 * bubble, and not its text. It is never a row of icons below the bubble.
		 *
		 * A device with no hover has no toolbar: a long press on the bubble opens
		 * the menu there. The toolbar is not in the layout there, so no state that
		 * shows it, such as a focus or an open tooltip, can show it on a touch
		 * screen.
		 *
		 * The frame can be narrower than the toolbar, so the toolbar takes its
		 * own full width. It does not wrap to the width of a short bubble.
		 */
		toolbar: {
			base: [
				flex.row,
				'absolute -top-6 z-10 w-max p-1',
				// A device with no hover opens the menu with a long press, and never
				// shows the toolbar.
				'[@media(hover:none)]:hidden',
				rounded.lg,
				// The fill is opaque and the ring is inside the toolbar, so the edge has
				// one tone over the page and over the bubble. A translucent fill and an
				// outer ring let the bubble show through the lower part of the
				// toolbar. The toolbar sits at the top edge of the message, so an outer
				// ring would also go past the edge of a host that clips its overflow.
				'[--popover-alpha:100%]',
				omote.bg.popover,
				ring.inset,
				// Hidden, but in the Tab order: a keyboard focus on the button shows the
				// toolbar, as the pointer does. A press also focuses the button, but that
				// focus does not show the toolbar, so the toolbar goes when the pointer
				// leaves. The toolbar takes no press while it is hidden, so it does not
				// cover the message above it.
				'pointer-events-none opacity-0',
				// A hover on the bubble shows the toolbar, and not a hover on the empty
				// side of the message row. The toolbar overlaps the bubble, so the
				// pointer goes onto it with no gap, and its own hover holds it.
				'group-has-[[data-slot=chat-message-bubble]:hover]/chat-message:pointer-events-auto',
				'group-has-[[data-slot=chat-message-bubble]:hover]/chat-message:opacity-100',
				'hover:pointer-events-auto hover:opacity-100',
				'group-has-focus-visible/chat-message:pointer-events-auto group-has-focus-visible/chat-message:opacity-100',
				// The menu portals out of the message, so neither hover nor focus can
				// hold the toolbar while it is open. The expanded button holds it.
				'has-aria-expanded:pointer-events-auto has-aria-expanded:opacity-100',
				// The check of a copy holds the toolbar until it goes, so the reader sees
				// it after the pointer leaves.
				'has-data-copied:pointer-events-auto has-data-copied:opacity-100',
				// The tooltip of a button portals out of the message, so a hover on it is
				// no hover on the message. The open tooltip holds the toolbar. A reader
				// who moves onto the tooltip keeps both, and both go when the pointer
				// leaves them.
				'has-data-tooltip-open:pointer-events-auto has-data-tooltip-open:opacity-100',
			],
			sender: {
				user: 'end-2',
				assistant: 'start-2',
				system: 'start-0',
			},
		},
		// A citation: a phrase of the prose that selects in a view beside the chat.
		// Piece 0 is a span with the button role, so it wraps with the prose. The
		// pieces after it are spans with the same look. It keeps the font and the foreground of the prose, so it reads on
		// each bubble. A dotted line under it marks it at rest. A solid line of
		// full ink and double weight marks it while it is active: while it is
		// pressed, or while the selection of its view matches it. The two states
		// have one look, because in each the view shows the selection of the
		// citation. `aria-pressed` and the description tell them apart. A fill
		// would change the background of the text, and on the user bubble that
		// lowers the contrast below 4.5:1.
		//
		// The line is a background image and not a text decoration. A browser
		// starts the dots of a text decoration again at each element in the
		// citation, so in `**4** to **14**` two dots touch and show as a dash
		// where a bold starts or stops. A background is one row of dots on each
		// line of the citation. `round` fits a whole number of dots on the line,
		// and the row starts 1 px in, so that each end of the line is half a gap.
		// Forced colors remove a background image, so there the line is a text
		// decoration.
		citation: [
			'cursor-pointer rounded-sm text-inherit box-decoration-clone',
			// biome-ignore lint/plugin/no-physical-side: the row of dots is the same in each direction
			'bg-linear-to-r from-current/60 from-50% to-transparent to-50%',
			'bg-size-[4px_1px] bg-position-[1px_calc(100%-0.2em)] [background-repeat:round_no-repeat]',
			'hover:to-current/60',
			'data-pressed:from-current data-pressed:to-current data-pressed:bg-size-[4px_2px]',
			'data-marked:from-current data-marked:to-current data-marked:bg-size-[4px_2px]',
			'forced-colors:underline forced-colors:decoration-dotted forced-colors:underline-offset-2',
			'forced-colors:hover:decoration-solid',
			'forced-colors:data-pressed:decoration-solid forced-colors:data-pressed:decoration-2',
			'forced-colors:data-marked:decoration-solid forced-colors:data-marked:decoration-2',
			focus.ring,
		],
		// A citation that selects in no view, such as a dataset that scopes a
		// question. It is not a control, so it takes no underline, which marks a
		// control. In a reply, it is a soft pill. Markdown cannot make a pill, so
		// the text of an agent cannot look like a citation. In the user bubble, it
		// is bold, as Markdown draws bold. The words are the words of the reader,
		// and a fill on the blue bubble is too heavy.
		citationStatic: [
			'box-decoration-clone',
			'in-data-[sender=user]:font-bold',
			'in-data-[sender=assistant]:rounded-md in-data-[sender=assistant]:px-1 in-data-[sender=assistant]:font-medium',
			'in-data-[sender=assistant]:bg-blue-500/15 in-data-[sender=assistant]:text-blue-800',
			'dark:in-data-[sender=assistant]:bg-blue-400/20 dark:in-data-[sender=assistant]:text-blue-300',
			forced.outline,
		],
		// The line of a failed reply. It inherits the foreground of the bubble, as
		// the step line does, and the red dot beside it marks the failure. The gap
		// above it is the `part` gap when the reply landed content first.
		failure: [flex.row, dan.gap.scale.sm, size.sm],
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
				// bubble: it lands at 4.4:1 on the assistant fill and worse on the user
				// bubble's blue. This inherits the bubble's foreground instead, the same
				// bargain the markdown kata takes, so the line reads on all four bubbles.
				fallback: [size.md, 'italic'],
				// The shape that holds the space of a held-back embed, as wide as the
				// bubble. The skeleton tone of a placeholder is one step from the
				// assistant fill and is hard to see on the blue of the user bubble. So
				// the shape rides `currentColor` at a low alpha, as the `tool` box does,
				// and shows on each bubble.
				// The dark class replaces the dark skeleton fill of the Placeholder.
				placeholder: [kokkaku.chat.embed, ...mode('bg-current/15', 'dark:bg-current/15')],
			},
		},
		/**
		 * A step the assistant took, drawn inside the bubble: the `tool` box, its
		 * head, and the parts of that head.
		 *
		 * Nothing here sets a foreground color. The bubble's fill differs by
		 * speaker, and a neutral that clears AA against one does not clear it
		 * against another. The rule rides `currentColor` at a low alpha, and the
		 * summary de-emphasizes by weight instead.
		 */
		tool: {
			// A closed step fits its head. A head wider than the bubble wraps at the
			// width of the bubble. An open step fills the bubble, so its detail has
			// room for a code block or a table. The panel of the collapse adds nothing
			// to the intrinsic width, so the bubble keeps its width and its prose does
			// not reflow. The width eases in the tempo of the panel height.
			// `interpolate-size` lets the width move between `fit-content` and a
			// length. An engine without it changes the width in one step.
			//
			// The minimum keeps the head on its line while the width moves. A width
			// between `fit-content` and `100%` resolves its percentage against zero
			// in the intrinsic width of the bubble. Without the minimum, the bubble
			// then narrows to its prose, and the summary wraps under the label.
			base: [
				'w-fit min-w-fit max-w-full rounded-xl border border-current/20 px-3 py-2',
				'has-[>[data-slot=collapse][data-open]]:w-full',
				'[interpolate-size:allow-keywords] motion-safe:transition-[width]',
				css.collapse,
			],
			slots: {
				// The head wraps. A summary that does not fit beside the label goes to a
				// line of its own and shows in full. The summary says what the step did,
				// such as the filter that it applied. A reader cannot check a filter that
				// the head cuts off, and on a phone the cut kept only the first words.
				head: [flex.row, 'w-full flex-wrap', dan.gap.scale.sm, 'text-start', size.sm],
				// A disclosure head is a button: give it the pointer and the package's own
				// focus ring rather than the UA outline. `inset` and not `ring`, because the
				// step is a bordered box: the case `sen.focus`'s own doc names for it, and
				// the reason `Collapse`'s bare trigger takes the outset one instead.
				//
				// The color reset is load-bearing. The collapse kata paints its trigger
				// `text.muted` with a `fg.hover`, which is right on the page and wrong in
				// a bubble: zinc-500 on the assistant fill is 4.4:1. These classes land
				// after the classes of the collapse kata, so the head inherits the
				// bubble again. That includes hover, or the pointer would walk it into a
				// fixed neutral on the blue of the user bubble.
				trigger: ['cursor-pointer rounded-lg', 'text-inherit hover:text-inherit', focus.inset],
				label: ['font-semibold'],
				summary: ['min-w-0', 'font-normal'],
				details: ['mt-2', size.sm],
			},
		},
	},
	defaults: { sender: 'assistant', streaming: false, editing: false, menu: false },
})

/**
 * Recipe variant props for {@link ChatMessage}: the styling axis its kata
 * exposes (`sender`), for consumers composing custom slots. The `streaming`
 * and `editing` axes of the bubble are props of the message, each with its own
 * description.
 */
export type ChatMessageVariants = Omit<
	VariantProps<typeof k>,
	'sender' | 'streaming' | 'editing' | 'menu'
> & {
	/** The author of the message, which sets the side that the message aligns to. @defaultValue 'assistant' */
	sender?: VariantProps<typeof k>['sender']
}
