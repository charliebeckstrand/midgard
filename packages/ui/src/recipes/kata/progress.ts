import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { maru } from '../maru'

export const progressTrack = tv({
	base: ['overflow-hidden', maru.rounded.full, 'bg-zinc-200', 'dark:bg-zinc-700'],
	variants: {
		size: {
			sm: 'h-1',
			md: 'h-2',
			lg: 'h-3',
		},
	},
	defaultVariants: { size: 'md' },
})

export const progressGauge = tv({
	base: ['inline-flex', 'items-center justify-center', 'relative'],
	variants: {
		size: {
			xs: 'size-6',
			sm: 'size-8',
			md: 'size-12',
			lg: 'size-16',
			xl: 'size-20',
		},
	},
	defaultVariants: { size: 'md' },
})

export type ProgressTrackVariants = VariantProps<typeof progressTrack>
export type ProgressGaugeVariants = VariantProps<typeof progressGauge>

export const slots = {
	bar: {
		fill: ['h-full', maru.rounded.full],
		indeterminate: 'w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]',
	},
	gauge: {
		label: ['absolute', 'font-semibold', ...iro.text.default],
		labelSize: {
			xs: 'text-[6px]',
			sm: 'text-[8px]',
			md: 'text-xs',
			lg: 'text-sm',
			xl: 'text-base',
		},
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
	bar: { track: progressTrack, ...slots.bar },
	gauge: { base: progressGauge, ...slots.gauge },
	color: slots.color,
	track: slots.track,
}
