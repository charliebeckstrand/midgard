import { tv } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { sen } from '../ryu/sen'
import { buttonSoft } from './button'

const header = tv({
	base: 'flex items-center justify-between',
	variants: {
		size: {
			sm: 'mb-sm',
			md: 'mb-md',
			lg: 'mb-lg',
		},
	},
	defaultVariants: { size: 'md' },
})

const footer = tv({
	base: ['flex items-center justify-center'],
	variants: {
		size: {
			sm: 'pb-xs gap-xs',
			md: 'pb-xs gap-sm',
			lg: 'pb-md gap-md',
		},
	},
	defaultVariants: { size: 'md' },
})

const pickerGrid = tv({
	base: 'grid grid-cols-3',
	variants: {
		size: {
			sm: 'px-sm',
			md: 'px-md',
			lg: 'px-lg',
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
	base: ['inline-flex flex-col', 'select-none'],
	grid: 'grid grid-cols-7',
	header,
	footer,
	picker: {
		grid: pickerGrid,
		cellCurrent: ['font-semibold', ...buttonSoft.blue],
	},
	weekday,
	day: {
		base: 'w-full ring-inset',
		active: [...sen.focus.ring],
		activeSelected: 'bg-blue-600',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
}

export { calendar as k }
