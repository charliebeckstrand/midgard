import { defineRecipe, iro, type VariantPropsOf } from '..'

export const k = defineRecipe({
	base: ['overflow-hidden', 'rounded-full', 'bg-zinc-200', 'dark:bg-zinc-800'],
	size: {
		sm: 'h-2',
		md: 'h-3',
		lg: 'h-4',
	},
	slots: {
		barIndeterminate: 'w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]',
		trackStroke: 'stroke-zinc-200 dark:stroke-zinc-700',
	},
	defaults: { size: 'md' },
})

export const progressBarFill = defineRecipe({
	base: ['h-full', 'rounded-full'],
	color: {
		zinc: 'bg-zinc-600 dark:bg-zinc-400',
		red: 'bg-red-600 dark:bg-red-500',
		amber: 'bg-amber-500',
		green: 'bg-green-600 dark:bg-green-500',
		blue: 'bg-blue-600 dark:bg-blue-500',
	},
	defaults: { color: 'zinc' },
})

export const progressGauge = defineRecipe({
	base: ['relative', 'inline-flex items-center justify-center'],
	size: {
		sm: 'size-12',
		md: 'size-16',
		lg: 'size-20',
		xl: 'size-24',
	},
	defaults: { size: 'md' },
})

export const progressGaugeLabel = defineRecipe({
	base: ['absolute', 'font-semibold', ...iro.text.default],
	size: {
		sm: 'text-xs',
		md: 'text-sm',
		lg: 'text-md',
		xl: 'text-lg',
	},
	defaults: { size: 'md' },
})

/**
 * Per-colour stroke / fill / bg classes shared between bar + gauge. Indexed
 * by the consumer's `color` prop; not a `defineRecipe` axis because the
 * three sub-tokens are emitted to different elements.
 */
export const color = {
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

export type ProgressTrackVariants = VariantPropsOf<typeof k>
export type ProgressBarFillVariants = VariantPropsOf<typeof progressBarFill>
export type ProgressGaugeVariants = VariantPropsOf<typeof progressGauge>
export type ProgressGaugeLabelVariants = VariantPropsOf<typeof progressGaugeLabel>
