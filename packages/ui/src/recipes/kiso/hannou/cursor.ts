/**
 * Hannou cursor: pointer feedback that tracks the disabled and the read-only
 * states. Disabled variants override `cursor-pointer` on the element or its
 * descendants. Each rule reads both spellings of disabled: the
 * native `:disabled` and `data-disabled`. One `has-[…]` holds the two in a
 * selector list. A descendant attribute takes its own brackets inside
 * `has-[…]`, as `has-[:disabled,[data-disabled]]`. The bare
 * `has-[data-disabled]` selects an element named `data-disabled`.
 *
 * A read-only control keeps the focus, but a press does not change it. Thus it
 * shows the default cursor, not the pointer. The rule reads the three spellings
 * of read-only on the element or a descendant: `aria-readonly="true"`,
 * `data-readonly`, and the native `readonly`. It does not read `:read-only`,
 * because each checkbox and each button matches that pseudo-class. The rule
 * sits in `:where()`, so it has the weight of one class. It thus replaces
 * `cursor-pointer`, which comes before it, and a disabled rule replaces it. A
 * control that is disabled and read-only shows `not-allowed`.
 *
 * Layer: kiso · Concern: pointer feedback
 */

export const cursor = [
	'cursor-pointer',
	'disabled:cursor-not-allowed data-disabled:cursor-not-allowed has-[:disabled,[data-disabled]]:cursor-not-allowed',
	'[&:where([aria-readonly=true],[data-readonly],[readonly],:has([aria-readonly=true],[data-readonly],[readonly]))]:cursor-default',
]

/**
 * What a surface the reader drags looks and behaves like.
 *
 * The closed hand follows the live drag, not `:active`. A right-click presses an
 * element into `:active` too. A context menu then swallows the matching
 * `pointerup`, and an `:active` cursor stays closed as if the surface were still
 * held. So each surface that takes these rules sets `data-dragging` while it is
 * held.
 *
 * Stated here because every draggable surface needs the same rules. Each one
 * that writes them out is a chance to leave one off. The katas had done that in
 * ten places, each slightly differently, and `grab-cursor-boundary.test.ts` now
 * keeps the rules here.
 */
export const grab = {
	/**
	 * The open hand, the closed one while held, and the two refusals a drag needs
	 * from the platform.
	 *
	 * `touch-none` is the load-bearing half. Without it the browser claims the
	 * gesture for scrolling before the element sees a second move. A handle that
	 * works with a mouse then does nothing under a finger. `select-none` stops the
	 * drag painting a text selection across whatever it passes over. On iOS, Safari can
	 * select the text in a descendant of a `select-none` box. Thus the descendants
	 * also set it. A finger that rests before it moves is a long press, and iOS
	 * shows its callout menu without `-webkit-touch-callout: none`.
	 */
	default: [
		'cursor-grab data-dragging:cursor-grabbing',
		'touch-none select-none **:select-none [-webkit-touch-callout:none]',
	],
} as const
