import { defineRecipe } from '../../core/recipe'
import { sen } from '../kiso'

const { focus } = sen

// A scrolling transcript (`overflow-y-auto`) is keyboard-focusable, so browsers
// paint the UA focus outline. `focus.inset` suppresses it and draws the
// library's inset blue ring; an outset ring would be clipped by the scroll.
export const k = defineRecipe({
	base: ['flex-1 grow overflow-y-auto min-h-0', focus.inset],
})
