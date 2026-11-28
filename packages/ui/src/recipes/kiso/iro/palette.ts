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
 * The text of a bare entry is on the page surface. In each chromatic hue it is
 * 700 in light and 400 in dark, as the chart `ink` (`zu.palette`) is. Zinc is
 * 500 in light and 400 in dark, because it is the `muted` rung, and 500 is the
 * least emphatic rung on the page (`ramp.ts`). Each shade clears AA (4.5:1) on
 * the page, so the `onSurface` shades of the ramp, and thus the `iro.text`
 * intents, read it. The bare hover is one step past rest: 800 in light and 300
 * in dark in each chromatic hue, and the strong neutral in zinc.
 * Soft, outline, and plain text is 800 in light and 400 in dark for each hue.
 * In light, 700 misses AA on the 15% soft fill in some hues (amber, green), so
 * each hue takes 800. The soft hover fill is 30%, and 400 text misses AA on it
 * in dark in some hues. Thus the soft hover of each hue sets the dark text to
 * 300. In light the 800 text clears the hover fill, so the hover sets no light
 * text: a hover text class with no `dark:` prefix also wins in dark.
 * `contrast.test.ts` measures each entry through Button, at rest and on hover.
 *
 * A mark (`<Code>`, `<Kbd>`) has the default text color, which clears 4.5:1 on
 * the page (`shaku.mark`). A solid fill is not the page, and its own text color
 * is the color that clears 4.5:1 on it. Thus a mark on a solid fill keeps the
 * text color of the fill (`onFill`). The usual fill of a mark is 15% of its
 * text color, so on a solid fill the fill of the mark moves toward its text,
 * and the text falls below 4.5:1 (white on green 3.82, amber-950 on the amber
 * hover 3.81). Thus a mark on a solid fill has no fill of its own. Its text
 * then has the contrast of the text of the fill, at rest and on hover. An
 * inset outline in the text color at 50% shows the edge of the mark. The
 * outline is decoration, because the text gives the meaning. Forced colors
 * remove the ring, so an inset outline takes its place there.
 *
 * Layer: kiso · Concern: chromatic palette
 */

/** A mark on a solid fill keeps the text color of the fill, with an inset outline and no fill. */
const onFill = [
	'**:data-[slot=code]:text-current',
	'**:data-[slot=code]:bg-transparent',
	'**:data-[slot=code]:ring-1',
	'**:data-[slot=code]:ring-inset',
	'**:data-[slot=code]:ring-current/50',
	'**:data-[slot=code]:forced-colors:outline-solid',
	'**:data-[slot=code]:forced-colors:outline-1',
	'**:data-[slot=code]:forced-colors:-outline-offset-1',
	'**:data-[slot=kbd]:text-current',
	'**:data-[slot=kbd]:bg-transparent',
	'**:data-[slot=kbd]:ring-1',
	'**:data-[slot=kbd]:ring-inset',
	'**:data-[slot=kbd]:ring-current/50',
	'**:data-[slot=kbd]:forced-colors:outline-solid',
	'**:data-[slot=kbd]:forced-colors:outline-1',
	'**:data-[slot=kbd]:forced-colors:-outline-offset-1',
].join(' ')

export const palette = {
	solid: {
		zinc: `bg-zinc-600 text-white ${onFill}`,
		red: `bg-red-600 text-white ${onFill}`,
		amber: `bg-amber-500 text-amber-950 ${onFill}`,
		green: `bg-green-700 text-white ${onFill}`,
		blue: `bg-blue-600 text-white ${onFill}`,
	},
	soft: {
		zinc: 'bg-zinc-500/15 text-zinc-800 dark:text-zinc-400',
		red: 'bg-red-500/15 text-red-800 dark:text-red-400',
		amber: 'bg-amber-500/15 text-amber-800 dark:text-amber-400',
		green: 'bg-green-500/15 text-green-800 dark:text-green-400',
		blue: 'bg-blue-500/15 text-blue-800 dark:text-blue-400',
	},
	outline: {
		zinc: 'ring-zinc-800 dark:ring-zinc-600 text-zinc-800 dark:text-zinc-400',
		red: 'ring-red-600 dark:ring-red-700 text-red-800 dark:text-red-400',
		amber: 'ring-amber-500 dark:ring-amber-600 text-amber-800 dark:text-amber-400',
		green: 'ring-green-600 dark:ring-green-700 text-green-800 dark:text-green-400',
		blue: 'ring-blue-600 dark:ring-blue-700 text-blue-800 dark:text-blue-400',
	},
	plain: {
		zinc: 'text-zinc-800 dark:text-zinc-400',
		red: 'text-red-800 dark:text-red-400',
		amber: 'text-amber-800 dark:text-amber-400',
		green: 'text-green-800 dark:text-green-400',
		blue: 'text-blue-800 dark:text-blue-400',
	},
	bare: {
		zinc: 'text-zinc-500 dark:text-zinc-400',
		red: 'text-red-700 dark:text-red-400',
		amber: 'text-amber-700 dark:text-amber-400',
		green: 'text-green-700 dark:text-green-400',
		blue: 'text-blue-700 dark:text-blue-400',
	},
} as const

/** The extended hues (rose / violet / sky) of each variant, for a kata that opts into them. */
export const extended = {
	solid: {
		rose: `bg-rose-600 text-white ${onFill}`,
		violet: `bg-violet-600 text-white ${onFill}`,
		sky: `bg-sky-700 text-white ${onFill}`,
	},
	soft: {
		rose: 'bg-rose-500/15 text-rose-800 dark:text-rose-400',
		violet: 'bg-violet-500/15 text-violet-800 dark:text-violet-400',
		sky: 'bg-sky-500/15 text-sky-800 dark:text-sky-400',
	},
	outline: {
		rose: 'ring-rose-600 dark:ring-rose-700 text-rose-800 dark:text-rose-400',
		violet: 'ring-violet-600 dark:ring-violet-700 text-violet-800 dark:text-violet-400',
		sky: 'ring-sky-600 dark:ring-sky-700 text-sky-800 dark:text-sky-400',
	},
	plain: {
		rose: 'text-rose-800 dark:text-rose-400',
		violet: 'text-violet-800 dark:text-violet-400',
		sky: 'text-sky-800 dark:text-sky-400',
	},
	bare: {
		rose: 'text-rose-700 dark:text-rose-400',
		violet: 'text-violet-700 dark:text-violet-400',
		sky: 'text-sky-700 dark:text-sky-400',
	},
} as const

/** The hover of an outline and of a plain entry: the 15% soft fill of its hue. */
const wash = {
	zinc: 'not-disabled:not-data-disabled:hover:bg-zinc-500/15',
	red: 'not-disabled:not-data-disabled:hover:bg-red-500/15',
	amber: 'not-disabled:not-data-disabled:hover:bg-amber-500/15',
	green: 'not-disabled:not-data-disabled:hover:bg-green-500/15',
	blue: 'not-disabled:not-data-disabled:hover:bg-blue-500/15',
	rose: 'not-disabled:not-data-disabled:hover:bg-rose-500/15',
	violet: 'not-disabled:not-data-disabled:hover:bg-violet-500/15',
	sky: 'not-disabled:not-data-disabled:hover:bg-sky-500/15',
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
		zinc: 'not-disabled:not-data-disabled:hover:bg-zinc-500/30 dark:not-disabled:not-data-disabled:hover:text-zinc-300',
		red: 'not-disabled:not-data-disabled:hover:bg-red-500/30 dark:not-disabled:not-data-disabled:hover:text-red-300',
		amber:
			'not-disabled:not-data-disabled:hover:bg-amber-500/30 dark:not-disabled:not-data-disabled:hover:text-amber-300',
		green:
			'not-disabled:not-data-disabled:hover:bg-green-500/30 dark:not-disabled:not-data-disabled:hover:text-green-300',
		blue: 'not-disabled:not-data-disabled:hover:bg-blue-500/30 dark:not-disabled:not-data-disabled:hover:text-blue-300',
		rose: 'not-disabled:not-data-disabled:hover:bg-rose-500/30 dark:not-disabled:not-data-disabled:hover:text-rose-300',
		violet:
			'not-disabled:not-data-disabled:hover:bg-violet-500/30 dark:not-disabled:not-data-disabled:hover:text-violet-300',
		sky: 'not-disabled:not-data-disabled:hover:bg-sky-500/30 dark:not-disabled:not-data-disabled:hover:text-sky-300',
	},
	outline: wash,
	plain: wash,
	bare: {
		zinc: 'not-disabled:not-data-disabled:hover:text-zinc-950 dark:not-disabled:not-data-disabled:hover:text-white',
		red: 'not-disabled:not-data-disabled:hover:text-red-800 dark:not-disabled:not-data-disabled:hover:text-red-300',
		amber:
			'not-disabled:not-data-disabled:hover:text-amber-800 dark:not-disabled:not-data-disabled:hover:text-amber-300',
		green:
			'not-disabled:not-data-disabled:hover:text-green-800 dark:not-disabled:not-data-disabled:hover:text-green-300',
		blue: 'not-disabled:not-data-disabled:hover:text-blue-800 dark:not-disabled:not-data-disabled:hover:text-blue-300',
		rose: 'not-disabled:not-data-disabled:hover:text-rose-800 dark:not-disabled:not-data-disabled:hover:text-rose-300',
		violet:
			'not-disabled:not-data-disabled:hover:text-violet-800 dark:not-disabled:not-data-disabled:hover:text-violet-300',
		sky: 'not-disabled:not-data-disabled:hover:text-sky-800 dark:not-disabled:not-data-disabled:hover:text-sky-300',
	},
} as const
