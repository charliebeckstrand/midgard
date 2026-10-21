import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { dan, ji, kasane, narabi, sen } from '../kiso'

const { weight, leading } = ji
const { rounded } = kasane
const { flex } = narabi
const { forced, ring } = sen

/** The title size: `text-lg` at `md`, one rung above `ji.ramp` at each step. */
const titleRamp = dan.text.title

/**
 * Alert kata. The padding, the text, and the title take the step of the
 * nearest density scope, and Icon takes the same step. The close button is
 * centered on the height of the alert. At `md` the alert is `p-4` with
 * `text-base` and a `text-lg` title.
 *
 * Soft and solid draw the alert with only a background, and the `ring-1` of
 * outline is a box-shadow. Forced colors remove both, so the base carries a
 * forced outline to keep the edge of each variant.
 */
export const k = defineRecipe({
	base: [flex.row, 'w-fit', dan.space.alert, dan.gap.scale.sm, rounded.lg, ji.ramp, forced.outline],
	variant: {
		outline: ring.line[1].inset,
	},
	// One literal class string for each variant and color.
	palette: definePalette({
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
	}),
	slots: {
		icon: 'shrink-0 self-center',
		title: [titleRamp, weight.semibold],
		description: [leading.tight, 'col-start-2'],
		content: [flex.fill, 'min-w-0', dan.gap.scale.sm],
		/** The two columns of the content beside an icon. */
		columns: ['grid grid-cols-[auto_minmax(0,1fr)]', dan.gap.x.sm],
		body: 'col-start-2',
		actions: [flex.row, dan.gap.scale.xs],
		close: [flex.row, 'shrink-0 self-center'],
	},
	defaults: { variant: 'soft', color: 'zinc' },
})

/** Recipe variant props for {@link Alert}: the styling axes its kata exposes (`variant`, `color`), for consumers composing custom slots. */
export type AlertVariants = Omit<VariantProps<typeof k>, 'variant' | 'color'> & {
	/** The fill style of the alert. @defaultValue 'soft' */
	variant?: VariantProps<typeof k>['variant']
	/**
	 * The palette color of the alert. It replaces the color of the `severity`.
	 * With no `color`, a `severity` sets its own color: blue, green, amber, or
	 * red.
	 *
	 * @defaultValue 'zinc'
	 */
	color?: VariantProps<typeof k>['color']
}
