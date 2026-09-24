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
 * The grab cursors of a surface the reader drags: the open hand at rest, and the
 * closed hand while the surface carries `data-dragging`.
 *
 * The closed hand follows the live drag, not `:active`. A right-click presses an
 * element into `:active` too. A context menu then swallows the matching
 * `pointerup`, and an `:active` cursor stays closed as if the surface were still
 * held. So each surface that takes these rules sets `data-dragging` while it is
 * held.
 *
 * Use it alone on a surface that must keep touch scrolling, such as a card that
 * a grip also drags. Else use {@link grab}.
 */
export const grabCursor = ['cursor-grab', 'data-[dragging]:cursor-grabbing']

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
 * one that writes them out is a chance to leave one off. The katas had done that
 * in ten places, each slightly differently, and
 * `grab-cursor-boundary.test.ts` now keeps the rules here.
 */
export const grab = [...grabCursor, 'touch-none select-none']
