import { defineKata } from '../../core/recipe'

/**
 * Splitter kata: the unit of `<Splitter>`. The `base` slot is the element
 * reset of a window splitter. The splitter is an `<hr>`, and the handle that
 * renders it gives the size, the place, and the grip.
 */
export const k = defineKata({
	base: [
		// `h-auto` resets the Preflight `hr { height: 0 }`, so a splitter stretches
		// on the cross axis of its row. `border-0` removes the rule of the `<hr>`.
		'h-auto border-0',
		// The browser clips an `<hr>` to its box. The grip and its focus outline can
		// go past the box, so the overflow shows.
		'overflow-visible',
	],
})
