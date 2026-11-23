import { defineKata } from '../../core/recipe'
import { kasane, kokkaku, omote, sen } from '../kiso'

const { rounded } = kasane
const { focus, forced } = sen

// A transcript that overflows is a tab stop (`useScrollRegion`), so browsers
// paint the UA focus outline. `focus.inset` suppresses it and draws the
// library's inset blue ring; an outset ring would be clipped by the scroll.
//
// A transcript scrolls only on the block axis. `overflow-y-auto` alone makes
// the inline axis `auto` too, so a part a pixel wider than the rows would let
// the reader pan it sideways.
export const k = defineKata(
	{
		base: ['flex-1 overflow-y-auto overflow-x-hidden min-h-0', focus.inset],
		slots: {
			// The window measures each row as a whole box. A flex `gap` sits outside
			// every box, so no row would count it, and the spacers would drift by it.
			// The gap is each row's own padding instead.
			//
			// The ring of a bubble that the composer edits sits 4px out of the
			// bubble, and the scroll clips what is past its edge. Thus each row keeps
			// 4px of room below it, and the first row 4px above it. The gutter of the
			// content keeps the same room on each side. Between two rows, the room
			// below one and the top padding of the next make the 24px gap.
			row: 'pt-5 pb-1',
			first: 'py-1',
			content: kokkaku.chat.gutter,
			// The first row when the rows have a hover toolbar. The toolbar rises
			// above its message, and the scroll clips what sits above the first row,
			// so this keeps room for it. A device with no hover shows the actions as
			// a row below the bubble, so there the first row keeps only the room of
			// the ring.
			roomy: 'pt-8 pb-1 [@media(hover:none)]:pt-1',
			// The holder of the button that goes to the newest message. It sticks to
			// the bottom edge of the scroll and has no height, so it moves no row and
			// the end that the window measures stays the end of the rows. The button
			// rises out of it.
			newest: {
				base: 'sticky bottom-3 flex h-0 items-end justify-center',
				slots: { button: [rounded.full, omote.popover, 'shadow-md'] },
			},
		},
	},
	{
		// The skeleton bubble takes the tint fill, so the bubble shape shows
		// behind the placeholder lines in it. Forced colors remove the fill, so the
		// bubble takes the outline of a surface, as the real bubble does. The
		// skeleton bubble is a flex column, so the margins of two lines do not
		// collapse. The real bubble is not, because its parts rely on margins that
		// collapse.
		skeleton: {
			...kokkaku.chat,
			bubble: [...kokkaku.chat.bubble, 'flex flex-col', omote.bg.tint, forced.outline],
		},
	},
)
