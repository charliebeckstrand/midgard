/**
 * Progress kata: recipe-shaped surface serving both the linear `<ProgressBar>`
 * and the radial `<ProgressGauge>`. Carries a local per-color `bg` / `stroke`
 * table authored inline with `mode()`, rather than the shared `iro.palette`.
 * The SVG gauge needs a `stroke` variant the palette doesn't provide. The bar
 * reads the `bg` slice, the gauge the `stroke` slice.
 */

import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, narabi, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { ease, spring } = ugoki

/**
 * Per-color bg / stroke classes shared between bar and gauge. The bar's `fill`
 * recipe reads the `bg` slice, the gauge's indicator ring the `stroke` slice.
 * The gauge's track and label use fixed tokens, not this table.
 */
const color = {
	zinc: {
		bg: mode('bg-zinc-600', 'dark:bg-zinc-400'),
		stroke: mode('stroke-zinc-600', 'dark:stroke-zinc-400'),
	},
	red: {
		bg: mode('bg-red-600', 'dark:bg-red-500'),
		stroke: mode('stroke-red-600', 'dark:stroke-red-500'),
	},
	amber: {
		bg: mode('bg-amber-600', 'dark:bg-amber-500'),
		stroke: mode('stroke-amber-600', 'dark:stroke-amber-500'),
	},
	green: {
		bg: mode('bg-green-600', 'dark:bg-green-500'),
		stroke: mode('stroke-green-600', 'dark:stroke-green-500'),
	},
	blue: {
		bg: mode('bg-blue-600', 'dark:bg-blue-500'),
		stroke: mode('stroke-blue-600', 'dark:stroke-blue-500'),
	},
}

const fill = defineRecipe({
	base: ['h-full', rounded.full],
	color: {
		zinc: color.zinc.bg,
		red: color.red.bg,
		amber: color.amber.bg,
		green: color.green.bg,
		blue: color.blue.bg,
	},
	defaults: { color: 'zinc' },
})

const root = defineRecipe({
	base: ['relative', flex.inline, 'justify-center', kokkaku.progress.gauge.diameter],
})

const label = defineRecipe({
	base: ['absolute', weight.semibold, ...text.default, dan.text.small],
})

export const k = defineRecipe(
	{
		base: [
			'overflow-hidden',
			rounded.full,
			...mode('bg-zinc-200', 'dark:bg-zinc-800'),
			kokkaku.progress.bar.height,
		],
		skeleton: kokkaku.progress,
	},
	{
		color,
		/** Value-fill settle: the bar and gauge move to each new value on this spring. */
		spring: spring.settle,
		/** Value-fill jump: under reduced motion, the bar and gauge go to their value at once. */
		still: { duration: 0 },
		bar: {
			fill,
			indeterminate: 'w-1/3',
		},
		/**
		 * Indeterminate sweep: the third-width fill moves from before the start of
		 * the track to past its end, on a loop. A percentage in `translateX` is a
		 * fraction of the width of the fill, so 300% is the width of the track.
		 * The keyframes set `transform` directly, so Motion can give the loop to
		 * the animation engine of the browser.
		 */
		sweep: {
			animate: { transform: ['translateX(-100%)', 'translateX(300%)'] },
			transition: { duration: 1.5, ease: ease.inOut, repeat: Number.POSITIVE_INFINITY },
		},
		gauge: {
			root,
			label,
			track: mode('stroke-zinc-200', 'dark:stroke-zinc-700'),
		},
	},
)

/** The size scale of {@link ProgressBar}: the steps of its track height and label text. */
export const barScale = defineScale(dan.size.lineTiny, dan.text.small)

/** The size scale of {@link ProgressGauge}: the steps of its diameter and label text. */
export const gaugeScale = defineScale(dan.size.gauge, dan.text.small)

/** Props for the {@link ProgressBar} track: the `size` step that the component writes as a density scope. */
export type ProgressTrackVariants = { size?: ScaleStep<typeof barScale> }
export type ProgressBarFillVariants = Omit<VariantProps<typeof fill>, 'color'> & {
	/** The color of the fill. @defaultValue 'zinc' */
	color?: VariantProps<typeof fill>['color']
}
/** Props for the {@link ProgressGauge} root: the `size` step that the component writes as a density scope. */
export type ProgressGaugeVariants = { size?: ScaleStep<typeof gaugeScale> }
