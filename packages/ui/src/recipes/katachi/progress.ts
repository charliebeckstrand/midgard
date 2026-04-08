import { maru } from '../maru'
import { sumi } from '../sumi'

export const progress = {
	bar: {
		track: ['overflow-hidden', maru.roundedFull, 'bg-zinc-200 dark:bg-zinc-700'],
		fill: ['h-full', maru.roundedFull],
		size: {
			sm: 'h-1',
			md: 'h-2',
			lg: 'h-3',
		},
		defaults: { size: 'md' as const },
	},
	gauge: {
		wrapper: 'relative inline-flex items-center justify-center',
		size: {
			xs: 'size-6',
			sm: 'size-8',
			md: 'size-12',
			lg: 'size-16',
			xl: 'size-20',
		},
		label: ['absolute', sumi.text, 'font-semibold'],
		labelSize: {
			xs: 'text-[6px]',
			sm: 'text-[8px]',
			md: 'text-xs',
			lg: 'text-sm',
			xl: 'text-base',
		},
		defaults: { size: 'md' as const },
	},
	color: {
		zinc: {
			fill: 'fill-zinc-600 dark:fill-zinc-400',
			stroke: 'stroke-zinc-600 dark:stroke-zinc-400',
		},
		red: { fill: 'fill-red-600 dark:fill-red-500', stroke: 'stroke-red-600 dark:stroke-red-500' },
		amber: { fill: 'fill-amber-500', stroke: 'stroke-amber-500' },
		green: {
			fill: 'fill-green-600 dark:fill-green-500',
			stroke: 'stroke-green-600 dark:stroke-green-500',
		},
		blue: {
			fill: 'fill-blue-600 dark:fill-blue-500',
			stroke: 'stroke-blue-600 dark:stroke-blue-500',
		},
	},
	track: {
		stroke: 'stroke-zinc-200 dark:stroke-zinc-700',
	},
}
