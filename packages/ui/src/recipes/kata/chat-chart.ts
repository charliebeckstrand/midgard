import { defineRecipe } from '../../core/recipe'
import { sen } from '../kiso'

/**
 * ChatChart container. A message-level chart stands on its own edge rather than
 * inside a message bubble: a 1px {@link sen} border rounded to the bubble's
 * radius, its corners clipping the plot, spanning the message column so the
 * chart frame sizes itself within. Light padding lifts the plot off the border.
 */
export const k = defineRecipe({
	base: [sen.border.default, 'rounded-2xl overflow-hidden w-full p-2'],
})
