/**
 * Iro palette: the one source of the chromatic palette. Each entry is the
 * literal class string of a variant in a color, light and dark classes
 * together, because Tailwind's scanner finds only whole class literals.
 *
 * `palette` holds the colors at rest, in the standard hues, and `extended`
 * holds the extended hues of a kata that opts into them (Badge, Button).
 * `hover` holds the response to the pointer, gated on the disabled states. It
 * is apart because only a control takes a hover: Button reads it, a Badge reads
 * it only when it has an `href`, and Alert and Avatar do not read it.
 *
 * The text of a bare entry clears AA (4.5:1) on the page surface, so the
 * `onSurface` shades of the ramp, and thus the `iro.text` intents, read it.
 * Soft, outline, and plain text is one rung stronger, for the 15% soft fill.
 * `contrast.test.ts` measures each entry through Button.
 *
 * Layer: kiso · Concern: chromatic palette
 */

export const palette = {
	solid: {
		zinc: 'bg-zinc-600 text-white',
		red: 'bg-red-600 text-white',
		amber: 'bg-amber-500 text-amber-950',
		green: 'bg-green-700 text-white',
		blue: 'bg-blue-600 text-white',
	},
	soft: {
		zinc: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400',
		red: 'bg-red-500/15 text-red-700 dark:text-red-400',
		amber: 'bg-amber-500/15 text-amber-800 dark:text-amber-400',
		green: 'bg-green-500/15 text-green-800 dark:text-green-400',
		blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
	},
	outline: {
		zinc: 'ring-zinc-800 dark:ring-zinc-600 text-zinc-700 dark:text-zinc-400',
		red: 'ring-red-600 dark:ring-red-700 text-red-700 dark:text-red-400',
		amber: 'ring-amber-500 dark:ring-amber-600 text-amber-800 dark:text-amber-400',
		green: 'ring-green-600 dark:ring-green-700 text-green-800 dark:text-green-400',
		blue: 'ring-blue-600 dark:ring-blue-700 text-blue-700 dark:text-blue-400',
	},
	plain: {
		zinc: 'text-zinc-700 dark:text-zinc-400',
		red: 'text-red-700 dark:text-red-400',
		amber: 'text-amber-800 dark:text-amber-400',
		green: 'text-green-800 dark:text-green-400',
		blue: 'text-blue-700 dark:text-blue-400',
	},
	bare: {
		zinc: 'text-zinc-500 dark:text-zinc-400',
		red: 'text-red-600 dark:text-red-500',
		amber: 'text-amber-700 dark:text-amber-500',
		green: 'text-green-700 dark:text-green-500',
		blue: 'text-blue-600 dark:text-blue-500',
	},
} as const

/** The extended hues (rose / violet / sky) of each variant, for a kata that opts into them. */
export const extended = {
	solid: {
		rose: 'bg-rose-600 text-white',
		violet: 'bg-violet-600 text-white',
		sky: 'bg-sky-700 text-white',
	},
	soft: {
		rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
		violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
		sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
	},
	outline: {
		rose: 'ring-rose-600 dark:ring-rose-700 text-rose-700 dark:text-rose-400',
		violet: 'ring-violet-600 dark:ring-violet-700 text-violet-700 dark:text-violet-400',
		sky: 'ring-sky-600 dark:ring-sky-700 text-sky-700 dark:text-sky-400',
	},
	plain: {
		rose: 'text-rose-700 dark:text-rose-400',
		violet: 'text-violet-700 dark:text-violet-400',
		sky: 'text-sky-700 dark:text-sky-400',
	},
	bare: {
		rose: 'text-rose-600 dark:text-rose-500',
		violet: 'text-violet-600 dark:text-violet-400',
		sky: 'text-sky-700 dark:text-sky-500',
	},
} as const

export const hover = {
	solid: {
		zinc: 'not-disabled:not-data-disabled:hover:bg-zinc-700',
		red: 'not-disabled:not-data-disabled:hover:bg-red-700',
		amber: 'not-disabled:not-data-disabled:hover:bg-amber-600',
		green: 'not-disabled:not-data-disabled:hover:bg-green-800',
		blue: 'not-disabled:not-data-disabled:hover:bg-blue-700',
		rose: 'not-disabled:not-data-disabled:hover:bg-rose-700',
		violet: 'not-disabled:not-data-disabled:hover:bg-violet-700',
		sky: 'not-disabled:not-data-disabled:hover:bg-sky-800',
	},
	soft: {
		zinc: 'not-disabled:not-data-disabled:hover:bg-zinc-500/30',
		red: 'not-disabled:not-data-disabled:hover:bg-red-500/30',
		amber: 'not-disabled:not-data-disabled:hover:bg-amber-500/30',
		green: 'not-disabled:not-data-disabled:hover:bg-green-500/30',
		blue: 'not-disabled:not-data-disabled:hover:bg-blue-500/30',
		rose: 'not-disabled:not-data-disabled:hover:bg-rose-500/30',
		violet: 'not-disabled:not-data-disabled:hover:bg-violet-500/30',
		sky: 'not-disabled:not-data-disabled:hover:bg-sky-500/30',
	},
	outline: {
		zinc: 'not-disabled:not-data-disabled:hover:bg-zinc-500/15',
		red: 'not-disabled:not-data-disabled:hover:bg-red-500/15',
		amber: 'not-disabled:not-data-disabled:hover:bg-amber-500/15',
		green: 'not-disabled:not-data-disabled:hover:bg-green-500/15',
		blue: 'not-disabled:not-data-disabled:hover:bg-blue-500/15',
		rose: 'not-disabled:not-data-disabled:hover:bg-rose-500/15',
		violet: 'not-disabled:not-data-disabled:hover:bg-violet-500/15',
		sky: 'not-disabled:not-data-disabled:hover:bg-sky-500/15',
	},
	plain: {
		zinc: 'not-disabled:not-data-disabled:hover:bg-zinc-500/15',
		red: 'not-disabled:not-data-disabled:hover:bg-red-500/15',
		amber: 'not-disabled:not-data-disabled:hover:bg-amber-500/15',
		green: 'not-disabled:not-data-disabled:hover:bg-green-500/15',
		blue: 'not-disabled:not-data-disabled:hover:bg-blue-500/15',
		rose: 'not-disabled:not-data-disabled:hover:bg-rose-500/15',
		violet: 'not-disabled:not-data-disabled:hover:bg-violet-500/15',
		sky: 'not-disabled:not-data-disabled:hover:bg-sky-500/15',
	},
	bare: {
		zinc: 'not-disabled:not-data-disabled:hover:text-zinc-950 dark:not-disabled:not-data-disabled:hover:text-white',
		red: 'not-disabled:not-data-disabled:hover:text-red-700 dark:not-disabled:not-data-disabled:hover:text-red-400',
		amber:
			'not-disabled:not-data-disabled:hover:text-amber-800 dark:not-disabled:not-data-disabled:hover:text-amber-400',
		green:
			'not-disabled:not-data-disabled:hover:text-green-800 dark:not-disabled:not-data-disabled:hover:text-green-400',
		blue: 'not-disabled:not-data-disabled:hover:text-blue-700 dark:not-disabled:not-data-disabled:hover:text-blue-400',
		rose: 'not-disabled:not-data-disabled:hover:text-rose-700 dark:not-disabled:not-data-disabled:hover:text-rose-400',
		violet:
			'not-disabled:not-data-disabled:hover:text-violet-700 dark:not-disabled:not-data-disabled:hover:text-violet-400',
		sky: 'not-disabled:not-data-disabled:hover:text-sky-700 dark:not-disabled:not-data-disabled:hover:text-sky-400',
	},
} as const
