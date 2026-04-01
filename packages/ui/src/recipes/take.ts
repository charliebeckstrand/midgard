/**
 * Take (丈) — Measure.
 *
 * The proportions of a thing — how compact or generous, what scale.
 * Component size progressions from tight to spacious.
 *
 * Sizing follows three patterns:
 *   - Density scale (sm/md/lg): padding + text + icon for interactive controls
 *   - Dimension scale (xs–xl): absolute size for visual elements
 *   - Constraint scale (xs–7xl): max-width bounds for containers
 *
 * Branch of: Take (root)
 * Concern: sizing
 */

/** Icon-only button selector — matches when only child is a data-slot icon */
const io = '[&:has(>[data-slot=icon]:nth-child(2):last-child)]'

export const take = {
	/** Badge density scale — padding, text, icon per step */
	badge: {
		sm: 'px-1.5 py-0.5 text-xs/4 *:data-[slot=icon]:size-3',
		md: 'px-2 py-0.5 text-xs/5 *:data-[slot=icon]:size-3.5',
		lg: 'px-2.5 py-1 text-sm/5 *:data-[slot=icon]:size-4',
	},

	/** Button density scale — padding, text, icon-only square per step */
	button: {
		sm: [
			'px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1.5)-1px)] text-xs/5',
			`${io}:px-0 ${io}:py-0 ${io}:size-8 ${io}:gap-0`,
		],
		md: [
			'px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)] text-sm/6',
			`${io}:px-0 ${io}:py-0 ${io}:size-10 ${io}:gap-0`,
		],
		lg: [
			'px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] text-base/6',
			`${io}:px-0 ${io}:py-0 ${io}:size-12 ${io}:gap-0`,
		],
	},

	/** Avatar dimension scale — absolute sizing per step */
	avatar: {
		xs: 'size-6',
		sm: 'size-8',
		md: 'size-10',
		lg: 'size-12',
		xl: 'size-16',
	},

	/** Panel constraint scale — max-width for dialogs and sheets */
	panel: {
		xs: 'sm:max-w-xs',
		sm: 'sm:max-w-sm',
		md: 'sm:max-w-md',
		lg: 'sm:max-w-lg',
		xl: 'sm:max-w-xl',
		'2xl': 'sm:max-w-2xl',
		'3xl': 'sm:max-w-3xl',
		'4xl': 'sm:max-w-4xl',
		'5xl': 'sm:max-w-5xl',
		'6xl': 'sm:max-w-6xl',
		'7xl': 'sm:max-w-7xl',
	} satisfies Record<take.PanelSize, string>,

	/** Standard icon slot — sizing + shrink for data-slot="icon" children */
	icon: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
} as const

export namespace take {
	export type BadgeSize = keyof typeof take.badge
	export type ButtonSize = keyof typeof take.button
	export type AvatarSize = keyof typeof take.avatar
	export type PanelSize =
		| 'xs'
		| 'sm'
		| 'md'
		| 'lg'
		| 'xl'
		| '2xl'
		| '3xl'
		| '4xl'
		| '5xl'
		| '6xl'
		| '7xl'
}
