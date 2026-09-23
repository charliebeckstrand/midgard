import { defineRecipe } from '../../core/recipe'
import { sen } from '../kiso'

const { focus } = sen

// A scrolling transcript (`overflow-y-auto`) is keyboard-focusable, so browsers
// paint the UA focus outline. `focus.inset` suppresses it and draws the
// library's inset blue ring; an outset ring would be clipped by the scroll.
export const k = defineRecipe({
	base: ['flex-1 grow overflow-y-auto min-h-0', focus.inset],
	slots: {
		// The window measures each row as a whole box. A flex `gap` sits outside
		// every box, so no row would count it, and the spacers would drift by it.
		// The gap is each row's own top padding instead. Every row after the first
		// carries it, because the first sits flush.
		row: 'pt-6',
	},
})
