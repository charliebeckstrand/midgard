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
	/** Icon slot: keeps data-slot=icon children on CanvasText. */
	icon: 'forced-colors:*:data-[slot=icon]:text-[CanvasText]',
} as const
