/**
 * Katachi (形) — Shape and dimension.
 *
 * The form of a thing — how big, how wide, what proportions.
 * Icon sizes, panel widths, the physical envelope of an element.
 */

export const katachi = {
	/** Maru (丸) — the system border radius for softening edges */
	maru: 'rounded-lg',

	/** Max-width constraints for Dialog and Sheet panels */
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

	/** The standard icon slot — sizing + shrink for data-slot="icon" children */
	icon: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
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
