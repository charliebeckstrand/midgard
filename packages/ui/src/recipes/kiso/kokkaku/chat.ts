/**
 * Kokkaku skeleton: chat. One bubble per message, and one or two text lines
 * in each bubble. The message count comes from the composing skeleton.
 *
 * `root` fills the flex parent of the transcript, as the real transcript
 * does, and clips in place of a scroll. `room` is the room around the rows,
 * and `row` is the gap above each row. The real transcript and the skeleton
 * read both. `bubble` has the
 * width cap, the padding, and the radius of the real bubble, and `tail` holds the corner of
 * each side. `bubble` is `width` and `box` together. The real message reads
 * `width`, `box`, and `tail`, so the two cannot drift apart. Each line has the 6-unit line height of the `md` text of the
 * bubble: a 4-unit bar with a 1-unit margin above and below. `lines` holds the
 * line widths of each side. The widths are defaults, and the lines do not go
 * wider than the bubble. `embed` is the shape in place of an embed that waits
 * for the reader to reach it. It is as wide as the bubble, and the caller of
 * the shape sets its height.
 *
 * Layer: kiso · Concern: skeleton form · Unit: chat
 */

/**
 * The room on each side of the rows of a transcript, and below the last row.
 * The ring of a bubble that the composer edits sits 4px out of the bubble, and
 * the scroll clips what is past its edge. Above each row, the gap of the row
 * holds the ring.
 */
const room = 'px-1 pb-1'

const width = 'w-fit max-w-[min(100%,max(85%,--spacing(48)))]'

const box = ['px-4 py-3', 'rounded-2xl'] as const

export const chat = {
	root: ['min-h-0 flex-1 overflow-hidden', room],
	room,
	/**
	 * The 24px gap above each row of a transcript, the first row too. It holds
	 * the toolbar of the menu button, which rises 24px above the bubble.
	 */
	row: 'pt-6',
	/**
	 * The width of the bubble. The cap is 85% of the message, with a floor of
	 * 12rem, and never more than the full message. A shrink-to-fit parent (an
	 * inline-flex box, an auto grid column, a popover) takes its width from the
	 * bubble's text, and 85% of that is narrower than the text. Without the
	 * floor, a short bubble then breaks inside a word. The real message sets
	 * it on the frame around its bubble and the row below the bubble.
	 */
	width,
	/** The padding and the radius of the bubble. */
	box,
	bubble: [width, ...box],
	tail: {
		user: 'rounded-ee-md',
		assistant: 'rounded-es-md',
	},
	line: 'my-1 h-4 max-w-full',
	lines: {
		user: ['w-40'],
		assistant: ['w-72', 'w-48'],
	},
	embed: 'w-full',
} as const
