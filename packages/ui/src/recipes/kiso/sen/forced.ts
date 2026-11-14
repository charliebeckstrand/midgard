/**
 * Sen forced: Windows High Contrast Mode safety nets. Restore visible
 * edges and semantic color when the browser strips author colors.
 *
 * Layer: kiso · Concern: forced-colors fallbacks
 */

/**
 * The style, width, and color of the ring fallback. `outline-solid` sets the
 * style that an ungated `outline-none` removes.
 */
const ringOutline = [
	'forced-colors:focus-visible:outline-solid forced-colors:focus-visible:outline-2',
	'forced-colors:focus-visible:outline-[Highlight]',
]

export const forced = {
	/**
	 * Panel outline: restores a visible edge when backgrounds are stripped.
	 * `outline-solid` sets the style, because a bare `outline` reads the style
	 * that an ungated `outline-none` sets to none.
	 */
	outline: 'forced-colors:outline-solid forced-colors:outline-1',
	/**
	 * Keeps the author color of a part whose color is its content, such as a
	 * color swatch, so that a system color does not replace it.
	 */
	keep: 'forced-color-adjust-none',
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
	 * Text highlight: a wash behind text that marks a match, such as a search
	 * match. The `Highlight` of a {@link forced.mark} does not keep the contrast of
	 * the text on it, so the highlight paints in the `Mark` and `MarkText` pair.
	 */
	highlight: 'forced-colors:bg-[Mark] forced-colors:text-[MarkText]',
	/**
	 * Shape: a control that the reader sees only as its background, such as the
	 * grip bar of a panel. Forced colors remove that background, so the shape
	 * paints in `CanvasText`. A shape is not a state, so it does not take the
	 * `Highlight` of a {@link forced.mark}.
	 */
	shape: 'forced-colors:bg-[CanvasText]',
	/**
	 * Ring fallback: the 2 px `Highlight` outline that replaces a focus ring
	 * behind the `focus-visible` gate. See CONVENTIONS §5.10 for a ring behind
	 * another gate.
	 */
	ring: {
		/** Inside the box, as for an inset ring, or where a scroll container clips an outset stroke. */
		inset: [...ringOutline, 'forced-colors:focus-visible:-outline-offset-2'],
		/** Outside the box, as for an outset ring. */
		outset: [...ringOutline, 'forced-colors:focus-visible:outline-offset-2'],
	},
	/**
	 * Invalid fallback: the 2 px outline that replaces a red validation ring.
	 * Forced colors make red, amber, and green one color, so only the invalid
	 * state keeps a mark. The outline takes the text color, and a focus
	 * fallback paints it in `Highlight`.
	 */
	invalid: {
		/** Outside the invalid control itself, as for the thumb of a slider. */
		outset: [
			'forced-colors:data-invalid:outline-solid forced-colors:data-invalid:outline-2',
			'forced-colors:data-invalid:outline-offset-2',
		],
		/** On a surface that holds the invalid control, as for the box of a checkbox. */
		within:
			'forced-colors:has-[[data-invalid]]:outline-solid forced-colors:has-[[data-invalid]]:outline-2',
		/** Inside the `::after` overlay of a control frame that holds the invalid control. */
		overlay: [
			'forced-colors:has-[[data-invalid]]:after:outline-solid forced-colors:has-[[data-invalid]]:after:outline-2',
			'forced-colors:has-[[data-invalid]]:after:-outline-offset-2',
		],
	},
	/** Icon slot: keeps data-slot=icon children on CanvasText. */
	icon: 'forced-colors:*:data-[slot=icon]:text-[CanvasText]',
} as const
