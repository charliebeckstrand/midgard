/**
 * Progress kata: the unit of both the linear `<ProgressBar>` and the radial
 * `<ProgressGauge>`. The root slot is the track of the bar, and `bar.fill` and
 * `bar.indeterminate` are its fills. A bar with segments or marks also takes
 * `bar.layered`, holds its fills in `bar.fills`, and draws each mark with
 * `bar.mark`. The `gauge` slot holds `base`, `label`,
 * and `track`, the parts of the gauge. Its colors are the `iro.meter` shades,
 * which Sparkline also reads. The bar fill reads the `bg` row, and the gauge
 * ring reads the `stroke` row. The track and the label of the gauge use fixed
 * tokens.
 */

import { defineScale, type ScaleStep } from '../../core/density'
import { defineKata, mode, type VariantProps } from '../../core/recipe'
import { dan, iro, ji, kasane, kokkaku, narabi, sen, ugoki } from '../kiso'

const { meter, text } = iro
const { muted } = text
const { weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { spring } = ugoki
const { forced } = sen

const fill = {
	base: ['h-full', rounded.full, forced.mark],
	color: {
		zinc: meter.zinc.bg,
		red: meter.red.bg,
		amber: meter.amber.bg,
		green: meter.green.bg,
		blue: meter.blue.bg,
	},
}

const gauge = ['relative', flex.inline, 'justify-center', kokkaku.progress.gauge.diameter]

const label = {
	base: ['absolute', weight.semibold, ...text.default, dan.text.small, 'tabular-nums'],
}

export const k = defineKata(
	{
		base: [
			'overflow-hidden',
			rounded.full,
			...mode('bg-zinc-200', 'dark:bg-zinc-800'),
			forced.outline,
			kokkaku.progress.bar.height,
		],
		slots: {
			bar: {
				slots: {
					fill,
					/**
					 * Indeterminate fill: a third of the track that sweeps from the start of
					 * the track to past its end, on a loop. The keyframes are in
					 * `ui/tailwind.css`. Under reduced motion the fill holds still at the
					 * start of the track.
					 */
					indeterminate: [
						'w-1/3',
						'motion-safe:animate-progress-sweep',
						'rtl:motion-safe:animate-progress-sweep-rtl',
					],
					/**
					 * The root of a bar with segments or marks. A mark stands past the
					 * track, so the root does not clip, and `fills` clips in its place.
					 */
					layered: ['relative', 'overflow-visible'],
					/** The room above the track that a mark label takes. */
					labelled: 'mt-6',
					/** The row of segments: it clips them to the rounded track, and 2 px of track show between them. */
					fills: ['absolute', 'inset-0', 'flex', 'gap-0.5', 'overflow-hidden', rounded.full],
					/** One segment. It shrinks with the others when the gaps need room, and the track rounds its ends. */
					segment: ['min-w-0', 'shrink', 'rounded-none'],
					/** The free part of the track between the segments from the start and the segments from the end. */
					spacer: ['min-w-0', 'flex-1'],
					/**
					 * A mark: a 2 px line that stands 5 px past the track on each side. A
					 * 2 px border in the color of the surface on each side of the line
					 * sets it off from the segments.
					 */
					mark: [
						'absolute',
						'-inset-y-1.25',
						'box-content',
						'w-0.5',
						'border-x-2',
						'bg-clip-padding',
						'-ms-0.75',
						'pointer-events-none',
						...mode('bg-zinc-950', 'dark:bg-white'),
						...mode('border-white', 'dark:border-zinc-900'),
						forced.shape,
					],
					/** The label of a mark: 8 px above the track, centered on the line. */
					markLabel: [
						'absolute',
						'bottom-[calc(100%+--spacing(2))]',
						'-translate-x-1/2',
						'rtl:translate-x-1/2',
						'whitespace-nowrap',
						'pointer-events-none',
						weight.medium,
						...muted,
						dan.text.small,
						'tabular-nums',
					],
				},
			},
			gauge: {
				base: gauge,
				slots: {
					label,
					track: mode('stroke-zinc-200', 'dark:stroke-zinc-700'),
				},
			},
		},
		defaults: { color: 'zinc' },
	},
	{
		skeleton: kokkaku.progress,
		color: meter,
		/** Value-fill settle: the bar and gauge move to each new value on this spring. */
		spring: spring.settle,
		/** Value-fill jump: under reduced motion, the bar and gauge go to their value at once. */
		still: ugoki.instant,
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
export type ProgressBarFillVariants = {
	/** The color of the fill. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
}
/** Props for the {@link ProgressGauge} root: the `size` step that the component writes as a density scope. */
export type ProgressGaugeVariants = {
	/**
	 * The density step of the diameter and the readout text. Omit it to take the
	 * step of the nearest density scope.
	 */
	size?: ScaleStep<typeof scale.gauge>
}
