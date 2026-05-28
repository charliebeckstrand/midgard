/**
 * Kokkaku skeleton — heading. Height tracks the level; width caps at
 * `sm:max-w-sm` so multi-line skeletons land below the heading rather
 * than alongside it.
 *
 * Layer: kiso · Concern: skeleton form · Unit: heading
 */

export const heading = {
	base: 'sm:max-w-sm',
	level: {
		1: 'h-8',
		2: 'h-7',
		3: 'h-6',
		4: 'h-5',
		5: 'h-4',
		6: 'h-3',
	},
	defaults: { level: 1 as const },
}
