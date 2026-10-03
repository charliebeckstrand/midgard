/**
 * Kokkaku skeleton: chat. One bubble per message, and one or two text lines
 * in each bubble. The message count comes from the composing skeleton.
 *
 * `root` fills the flex parent of the transcript, as the real transcript
 * does, and clips in place of a scroll. `bubble` has the width cap, the
 * padding, and the radius of the real bubble, and `tail` holds the corner of
 * each side. Each line has the 6-unit line height of the `md` text of the
 * bubble: a 4-unit bar with a 1-unit margin above and below. The bubble is a
 * flex column, so the margins of two lines do not collapse. `lines` holds the
 * line widths of each side. The widths are defaults, and the lines do not go
 * wider than the bubble.
 *
 * Layer: kiso · Concern: skeleton form · Unit: chat
 */

export const chat = {
	root: 'min-h-0 flex-1 grow overflow-hidden',
	bubble: [
		'flex flex-col',
		'w-fit max-w-[min(100%,max(85%,--spacing(48)))]',
		'px-4 py-3',
		'rounded-2xl',
	],
	tail: {
		user: 'rounded-br-md',
		assistant: 'rounded-bl-md',
	},
	line: 'my-1 h-4 max-w-full',
	lines: {
		user: ['w-40'],
		assistant: ['w-72', 'w-48'],
	},
} as const
