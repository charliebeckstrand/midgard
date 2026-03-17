/**
 * Katachi (形) — Shape and dimension.
 *
 * The form of a thing — how big, how wide, what proportions.
 * Icon sizes, panel widths, the physical envelope of an element.
 *
 * Branch of: Ma (root)
 * Concern: sizing, dimensions
 */

export const katachi = {
	/** Max-width constraints for Dialog, Alert, and Sheet panels */
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
	} satisfies Record<katachi.PanelSize, string>,

	/** The standard icon size pair (string form for direct className use) */
	icon: '*:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:size-4',

	/** Base icon slot — sizing + shrink-0 */
	iconSlot: [
		'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
		'sm:*:data-[slot=icon]:size-4',
	],

	/** Icon-only containers — reset margins so icon centres cleanly */
	iconOnly: [
		'data-icon-only:*:data-[slot=icon]:mx-0',
		'data-icon-only:*:data-[slot=icon]:my-0',
		'sm:data-icon-only:*:data-[slot=icon]:my-0',
	],

	/** Trailing icon — last icon pushes right (chevrons, arrows) */
	iconTrailing: [
		'*:last:data-[slot=icon]:ml-auto *:last:data-[slot=icon]:size-5',
		'sm:*:last:data-[slot=icon]:size-4',
	],

	/** Pure CSS auto-detection for square aspect when element has icon but no label */
	iconDetect: [
		'[&:has([data-slot=icon]):not(:has([data-slot=label]))]:aspect-square',
		'[&:has([data-slot=icon]):not(:has([data-slot=label]))]:justify-center',
		'[&:has([data-slot=icon]):not(:has([data-slot=label]))]:w-auto',
	],
}

export namespace katachi {
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
