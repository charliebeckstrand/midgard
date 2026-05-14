import { tv } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { buttonSoft } from './button'

const base = tv({
	base: ['inline-flex flex-col', 'select-none'],
	variants: {
		size: {
			sm: 'w-72 p-3',
			md: 'w-80 p-4',
			lg: 'w-96 p-5',
		},
	},
	defaultVariants: { size: 'md' },
})

const header = tv({
	base: 'flex items-center justify-between',
	variants: {
		size: {
			sm: 'mb-1.5',
			md: 'mb-2',
			lg: 'mb-3',
		},
	},
	defaultVariants: { size: 'md' },
})

const footer = tv({
	base: ['flex items-center justify-center', 'gap-sm'],
	variants: {
		size: {
			sm: 'pb-3',
			md: 'pb-4',
			lg: 'pb-5',
		},
	},
	defaultVariants: { size: 'md' },
})

const pickerGrid = tv({
	base: 'grid grid-cols-3 gap-xs',
	variants: {
		size: {
			sm: 'p-1.5',
			md: 'p-2',
			lg: 'p-2.5',
		},
	},
	defaultVariants: { size: 'md' },
})

const weekday = tv({
	base: ['flex items-center justify-center', 'w-full aspect-square', 'font-medium', iro.text.muted],
	variants: {
		size: {
			sm: ji.size.xs,
			md: ji.size.sm,
			lg: ji.size.md,
		},
	},
	defaultVariants: { size: 'md' },
})

export const calendar = {
	base,
	grid: 'grid grid-cols-7',
	header,
	footer,
	nav: {
		icon: 'size-4.5',
	},
	picker: {
		grid: pickerGrid,
		cellCurrent: ['font-semibold', ...buttonSoft.blue],
	},
	weekday,
	day: {
		base: 'w-full aspect-square p-0 ring-inset',
		active: 'ring-2 ring-inset ring-blue-600',
		activeSelected: 'bg-blue-600',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
}

export { calendar as k }
