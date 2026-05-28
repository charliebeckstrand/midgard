/**
 * Shaku combobox — sub-pixel positioning for the combobox dropdown
 * caret. Insets 1px within the control border so the chevron edge
 * doesn't overlap the chrome on rendering at fractional zoom.
 *
 * Layer: kiso · Concern: combobox icon positioning
 */

export const combobox = {
	icon: 'absolute inset-y-px right-px',
}
