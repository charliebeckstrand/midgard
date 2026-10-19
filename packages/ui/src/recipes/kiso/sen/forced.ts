/**
 * Sen forced: Windows High Contrast Mode safety nets. Restore visible
 * edges and semantic color when the browser strips author colors.
 *
 * Layer: kiso · Concern: forced-colors fallbacks
 */

export const forced = {
	/** Panel outline: restores a visible edge when backgrounds are stripped. */
	outline: 'forced-colors:outline',
	/** Item text: preserves semantic foreground color. */
	text: 'forced-color-adjust-none forced-colors:text-[CanvasText]',
	/** Focus state: maps to system highlight colors. */
	focus: 'forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
	/** Form control: restores native appearance and checked-state visibility. */
	control:
		'forced-colors:opacity-100 forced-colors:appearance-auto forced-colors:checked:appearance-auto',
	/**
	 * State mark: a fill or a bar that shows a value or a selection with only
	 * its background. Forced colors remove that background, so the mark paints
	 * in `Highlight`.
	 */
	mark: 'forced-colors:bg-[Highlight]',
	/**
	 * Shape: a control that the reader sees only as its background, such as the
	 * grip bar of a panel. Forced colors remove that background, so the shape
	 * paints in `CanvasText`. A shape is not a state, so it does not take the
	 * `Highlight` of a {@link forced.mark}.
	 */
	shape: 'forced-colors:bg-[CanvasText]',
	/**
	 * Ring fallback: a 2 px `Highlight` outline that replaces a keyboard focus
	 * ring. A ring is a box-shadow, and forced colors remove a box-shadow.
	 * `outline-solid` sets the style that an ungated `outline-none` removes.
	 *
	 * These two entries hold the `focus-visible` gate only. A ring behind another
	 * gate, such as `has-[…]` or `group-focus-visible/name`, writes the same four
	 * classes behind that gate, because Tailwind reads only literal class names.
	 * The forced-colors boundary test makes sure that each state ring has its
	 * fallback.
	 */
	ring: {
		/** Inside the box, as for an inset ring, or where a scroll container clips an outset stroke. */
		inset: [
			'forced-colors:focus-visible:outline-solid forced-colors:focus-visible:outline-2',
			'forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[Highlight]',
		],
		/** Outside the box, as for an outset ring. */
		outset: [
			'forced-colors:focus-visible:outline-solid forced-colors:focus-visible:outline-2',
			'forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight]',
		],
	},
	/** Icon slot: keeps data-slot=icon children on CanvasText. */
	icon: 'forced-colors:*:data-[slot=icon]:text-[CanvasText]',
} as const
