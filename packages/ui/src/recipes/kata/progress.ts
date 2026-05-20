import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../../core/recipe'

export const progressTrack = tv({
	base: ['overflow-hidden', 'rounded-full', 'bg-zinc-200', 'dark:bg-zinc-800'],
	variants: {
		size: {
			sm: 'h-2',
			md: 'h-3',
			lg: 'h-4',
		},
	},
	defaultVariants: { size: 'md' },
})

export const progressBarFill = tv({
	base: ['h-full', 'rounded-full'],
	variants: {
		color: {
			zinc: 'bg-zinc-600 dark:bg-zinc-400',
			red: 'bg-red-600 dark:bg-red-500',
			amber: 'bg-amber-500',
			green: 'bg-green-600 dark:bg-green-500',
			blue: 'bg-blue-600 dark:bg-blue-500',
		},
	},
	defaultVariants: { color: 'zinc' },
})

export const progressGauge = tv({
	base: ['relative', 'inline-flex items-center justify-center'],
	variants: {
		size: {
			sm: 'size-12',
			md: 'size-16',
			lg: 'size-20',
			xl: 'size-24',
		},
	},
	defaultVariants: { size: 'md' },
})

export const progressGaugeLabel = tv({
	base: ['absolute', 'font-semibold', ...iro.text.default],
	variants: {
		size: {
			sm: 'text-xs',
			md: 'text-sm',
			lg: 'text-md',
			xl: 'text-lg',
		},
	},
	defaultVariants: { size: 'md' },
})

export type ProgressTrackVariants = VariantProps<typeof progressTrack>
export type ProgressBarFillVariants = VariantProps<typeof progressBarFill>
export type ProgressGaugeVariants = VariantProps<typeof progressGauge>
export type ProgressGaugeLabelVariants = VariantProps<typeof progressGaugeLabel>

export const slots = {
	bar: {
		indeterminate: 'w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]',
	},
	color: {
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
	},
	track: {
		stroke: 'stroke-zinc-200 dark:stroke-zinc-700',
	},
}

/** Kept for the `kata` barrel — not consumed directly. */
export const progress = {
	bar: { track: progressTrack, fill: progressBarFill, ...slots.bar },
	gauge: { base: progressGauge, label: progressGaugeLabel },
	color: slots.color,
	track: slots.track,
}

export {
	progressBarFill as progressBarFillVariants,
	progressGauge as progressGaugeVariants,
	progressGaugeLabel as progressGaugeLabelVariants,
	progressTrack as progressTrackVariants,
	slots as k,
}
