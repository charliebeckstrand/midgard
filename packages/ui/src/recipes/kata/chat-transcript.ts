import { defineKata } from '../../core/recipe'
import { kokkaku, omote, sen } from '../kiso'

const { focus } = sen

// A scrolling transcript (`overflow-y-auto`) is keyboard-focusable, so browsers
// paint the UA focus outline. `focus.inset` suppresses it and draws the
// library's inset blue ring; an outset ring would be clipped by the scroll.
export const k = defineKata(
	{
		base: ['flex-1 grow overflow-y-auto min-h-0', focus.inset],
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
