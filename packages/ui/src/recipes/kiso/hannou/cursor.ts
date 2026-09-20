/**
 * Hannou cursor: pointer feedback that tracks disabled state. Disabled
 * variants override `cursor-pointer` on the element or its descendants;
 * parent overrides like `has-disabled:**:cursor-not-allowed` apply for
 * sibling-label patterns.
 *
 * Layer: kiso · Concern: pointer feedback
 */

export const cursor = [
	'cursor-pointer',
	'disabled:cursor-not-allowed data-disabled:cursor-not-allowed has-[:disabled]:cursor-not-allowed has-[data-disabled]:cursor-not-allowed',
]

/**
 * What a surface the reader drags looks and behaves like. That is the open hand,
 * the closed one while held, and the two refusals a drag needs from the platform.
 *
 * `touch-none` is the load-bearing half. Without it the browser claims the
 * gesture for scrolling before the element sees a second move. A handle that
 * works with a mouse then does nothing under a finger. `select-none` stops the
 * drag painting a text selection across whatever it passes over.
 *
 * Stated here because every draggable surface needs the same four rules. Each
 * one that writes them out is a chance to leave one off. The katas had already
 * done that in six places, each slightly differently.
 */
export const grab = [
	'cursor-grab active:cursor-grabbing',
	'data-dragging:cursor-grabbing',
	'touch-none select-none',
]
