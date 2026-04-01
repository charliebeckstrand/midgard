/**
 * Take (丈) — Measure.
 *
 * The proportions of a thing — how compact or generous, what scale.
 * Component size progressions from tight to spacious.
 *
 * Branch of: Take (root)
 * Concern: sizing
 */

export const take = {
	/** Badge size scale — padding, text size, icon size per breakpoint */
	badge: {
		sm: 'px-1.5 py-0.5 text-xs/4 *:data-[slot=icon]:size-3',
		md: 'px-2 py-0.5 text-xs/5 *:data-[slot=icon]:size-3.5',
		lg: 'px-2.5 py-1 text-sm/5 *:data-[slot=icon]:size-4',
	},

	/** Button envelope — padding and icon-only square sizing */
	button: [
		'px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]',
		// Icon-only — square with equal padding when only child is an icon
		// TouchTarget wraps children in a fragment with a hidden <span> + {children},
		// so icon-only buttons have exactly 2 element children: the span and the icon.
		// :nth-child(2):last-child ensures the icon is the only real child.
		'[&:has(>[data-slot=icon]:nth-child(2):last-child)]:px-0 [&:has(>[data-slot=icon]:nth-child(2):last-child)]:py-0',
		'[&:has(>[data-slot=icon]:nth-child(2):last-child)]:size-10',
		'[&:has(>[data-slot=icon]:nth-child(2):last-child)]:gap-0',
	],

	/** Avatar size scale — dimensions per breakpoint */
	avatar: {
		xs: 'size-6',
		sm: 'size-8',
		md: 'size-10',
		lg: 'size-12',
		xl: 'size-16',
	},
} as const

export namespace take {
	export type BadgeSize = keyof typeof take.badge
	export type AvatarSize = keyof typeof take.avatar
}
