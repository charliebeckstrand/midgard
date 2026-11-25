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
		base: ['flex-1 overflow-y-auto overflow-x-hidden min-h-0', kokkaku.chat.room, focus.inset],
		slots: {
			// Each message is a row, and each row has the 24px gap above it, the first
			// row too. The window measures each row as a whole box. A flex `gap` sits
			// outside every box, so no row would count it, and the spacers would drift
			// by it. The gap is thus the padding of the row. It is also the room of
			// the toolbar of the menu button, which rises 24px above the bubble, and
			// of the ring of a bubble that the composer edits. A device with no hover
			// has no toolbar, so there the first row keeps only the room of the ring
			// above it (`first`). The transcript adds it by the index of the row, and
			// not by its place among the children: the window does not always draw
			// the first row first.
			row: kokkaku.chat.row,
			first: kokkaku.chat.first,
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
