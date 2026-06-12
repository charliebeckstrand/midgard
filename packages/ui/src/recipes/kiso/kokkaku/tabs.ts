/**
 * Kokkaku skeleton: tabs. One tab line per size step at the tab's text
 * line height; the bottom margin mirrors the horizontal tab's padding
 * above the list rail. Tab count comes from the composing skeleton.
 *
 * Layer: kiso · Concern: skeleton form · Unit: tabs
 */

export const tabs = {
	tab: {
		base: '',
		size: {
			sm: 'mb-3 h-5 w-14',
			md: 'mb-4 h-6 w-16',
			lg: 'mb-5 h-7 w-20',
		},
		defaults: { size: 'md' as const },
	},
} as const
