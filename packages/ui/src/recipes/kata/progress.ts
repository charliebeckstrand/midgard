import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { iro, ji } from '../kiso'

/**
 * Per-colour fill / bg / stroke classes shared between bar + gauge. The
 * gauge reads all three (`fill` on the indicator circle, `stroke` on the
 * track, `bg` on the central label); `bar.fill` indexes into the
 * `bg` slice for its colour axis.
 */
const color = {
	zinc: {
		fill: 'fill-zinc-600 dark:fill-zinc-400',
		bg: 'bg-zinc-600 dark:bg-zinc-400',
		stroke: 'stroke-zinc-600 dark:stroke-zinc-400',
	},
	red: {
		fill: 'fill-red-600 dark:fill-red-500',
		bg: 'bg-red-600 dark:bg-red-500',
		stroke: 'stroke-red-600 dark:stroke-red-500',
	},
	amber: {
		fill: 'fill-amber-500',
		bg: 'bg-amber-500',
		stroke: 'stroke-amber-500',
	},
	green: {
		fill: 'fill-green-600 dark:fill-green-500',
		bg: 'bg-green-600 dark:bg-green-500',
		stroke: 'stroke-green-600 dark:stroke-green-500',
	},
	blue: {
		fill: 'fill-blue-600 dark:fill-blue-500',
		bg: 'bg-blue-600 dark:bg-blue-500',
		stroke: 'stroke-blue-600 dark:stroke-blue-500',
	},
}

const barFill = defineRecipe({
	base: ['h-full', 'rounded-full'],
	color: {
		zinc: color.zinc.bg,
		red: color.red.bg,
		amber: color.amber.bg,
		green: color.green.bg,
		blue: color.blue.bg,
	},
	defaults: { color: 'zinc' },
})

const gaugeRoot = defineRecipe({
	base: ['relative', 'inline-flex items-center justify-center'],
	size: {
		sm: 'size-12',
		md: 'size-16',
		lg: 'size-20',
		xl: 'size-24',
	},
	defaults: { size: 'md' },
})

const gaugeLabel = defineRecipe({
	base: ['absolute', 'font-semibold', ...iro.text.default],
	size: {
		sm: ji.xs,
		md: ji.sm,
		lg: ji.md,
		xl: ji.lg,
	},
	defaults: { size: 'md' },
})

export const k = defineRecipe(
	{
		base: ['overflow-hidden', 'rounded-full', 'bg-zinc-200', 'dark:bg-zinc-800'],
		size: {
			sm: 'h-2',
			md: 'h-3',
			lg: 'h-4',
		},
		defaults: { size: 'md' },
	},
	{
		color,
		bar: {
			fill: barFill,
			indeterminate: 'w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]',
		},
		gauge: {
			root: gaugeRoot,
			label: gaugeLabel,
			track: 'stroke-zinc-200 dark:stroke-zinc-700',
		},
	},
)

export type ProgressTrackVariants = VariantPropsOf<typeof k>
export type ProgressBarFillVariants = VariantPropsOf<typeof barFill>
export type ProgressGaugeVariants = VariantPropsOf<typeof gaugeRoot>
