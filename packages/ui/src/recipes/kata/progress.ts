/**
 * Progress kata: recipe-shaped surface serving both the linear `<ProgressBar>`
 * and the radial `<ProgressGauge>`. Its colors are the `iro.meter` shades,
 * which Sparkline also reads. The bar fill reads the `bg` row, and the gauge
 * ring reads the `stroke` row. The track and the label of the gauge use fixed
 * tokens.
 */

import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, narabi, sen, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { meter, text } = iro
const { weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { ease, spring } = ugoki
const { forced } = sen

const fill = defineRecipe({
	base: ['h-full', rounded.full, forced.mark],
	color: {
		zinc: meter.zinc.bg,
		red: meter.red.bg,
		amber: meter.amber.bg,
		green: meter.green.bg,
		blue: meter.blue.bg,
	},
	defaults: { color: 'zinc' },
})

const gauge = defineRecipe({
	base: ['relative', flex.inline, 'justify-center', kokkaku.progress.gauge.diameter],
})

const label = defineRecipe({
	base: ['absolute', weight.semibold, ...text.default, dan.text.small, 'tabular-nums'],
})

export const k = defineRecipe(
	{
		base: [
			'overflow-hidden',
			rounded.full,
			...mode('bg-zinc-200', 'dark:bg-zinc-800'),
			forced.outline,
			kokkaku.progress.bar.height,
		],
		skeleton: kokkaku.progress,
	},
	{
		color: meter,
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
			base: gauge,
			label,
			track: mode('stroke-zinc-200', 'dark:stroke-zinc-700'),
		},
	},
)

/**
 * The size scales. `bar` is the scale of {@link ProgressBar}: the steps of its
 * track height. `gauge` is the scale of {@link ProgressGauge}: the steps of its
 * diameter and label text.
 */
export const scale = {
	bar: defineScale(dan.size.line.tiny),
	gauge: defineScale(dan.size.gauge, dan.text.small),
} as const

/** Props for the {@link ProgressBar} track: the `size` step that the component writes as a density scope. */
export type ProgressTrackVariants = {
	/** The density step of the track height. Omit it to take the step of the nearest density scope. */
	size?: ScaleStep<typeof scale.bar>
}
/** Props for the {@link ProgressBar} fill: its `color`. */
export type ProgressBarFillVariants = Omit<VariantProps<typeof fill>, 'color'> & {
	/** The color of the fill. @defaultValue 'zinc' */
	color?: VariantProps<typeof fill>['color']
}
/** Props for the {@link ProgressGauge} root: the `size` step that the component writes as a density scope. */
export type ProgressGaugeVariants = {
	/**
	 * The density step of the diameter and the readout text. Omit it to take the
	 * step of the nearest density scope.
	 */
	size?: ScaleStep<typeof scale.gauge>
}
