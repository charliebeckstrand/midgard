import { defineKata } from '../../core/recipe'
import { kasane, kokkaku, omote, sen } from '../kiso'

const { rounded } = kasane
const { focus } = sen

// A transcript that overflows is a tab stop (`useScrollRegion`), so browsers
// paint the UA focus outline. `focus.inset` suppresses it and draws the
// library's inset blue ring; an outset ring would be clipped by the scroll.
//
// A transcript scrolls only on the block axis. `overflow-y-auto` alone makes
// the inline axis `auto` too, so a part a pixel wider than the rows would let
// the reader pan it sideways.
export const k = defineKata(
	{
		base: ['flex-1 grow overflow-y-auto overflow-x-hidden min-h-0', focus.inset],
		slots: {
			// The window measures each row as a whole box. A flex `gap` sits outside
			// every box, so no row would count it, and the spacers would drift by it.
			// The gap is each row's own top padding instead. Every row after the first
			// carries it, because the first sits flush.
			row: 'pt-6',
			// The first row when the rows have a hover toolbar. The toolbar rises
			// above its message, and the scroll clips what sits above the first row,
			// so this keeps room for it. A device with no hover shows the actions as
			// a row below the bubble, so there the first row sits flush again.
			first: 'pt-8 [@media(hover:none)]:pt-0',
			// The holder of the button that goes to the newest message. It sticks to
			// the bottom edge of the scroll and has no height, so it moves no row and
			// the end that the window measures stays the end of the rows. The button
			// rises out of it.
			newest: 'sticky bottom-3 flex h-0 items-end justify-center',
			newestButton: [rounded.full, omote.popover, 'shadow-md'],
		},
	},
	{
		// The skeleton bubble takes the tint fill, so the bubble shape shows
		// behind the placeholder lines in it.
		skeleton: {
			...kokkaku.chat,
			bubble: [...kokkaku.chat.bubble, omote.bg.tint],
		},
	},
)
