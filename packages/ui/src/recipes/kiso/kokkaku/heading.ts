/**
 * Kokkaku skeleton — heading. Height tracks the resolved type-scale rung
 * (the level's natural size shifted by the ambient density step), so the
 * placeholder matches the real heading at every density. Width caps at
 * `sm:max-w-sm` so multi-line skeletons land below the heading rather than
 * alongside it.
 *
 * Layer: kiso · Concern: skeleton form · Unit: heading
 */

export const heading = {
	base: 'sm:max-w-sm',
	scale: {
		xs: 'h-2',
		sm: 'h-3',
		md: 'h-4',
		lg: 'h-5',
		xl: 'h-6',
		'2xl': 'h-7',
		'3xl': 'h-8',
		'4xl': 'h-9',
	},
}
