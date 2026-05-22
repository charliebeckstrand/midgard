import { defineRecipe } from '../../core/recipe'
import { iro, ji, sen } from '../kiso'

const { soft } = iro.palette

const base = defineRecipe({
	base: ['inline-flex flex-col', 'select-none'],
	size: {
		sm: 'w-52',
		md: 'w-68',
		lg: 'w-80',
	},
	defaults: { size: 'md' },
})

const header = defineRecipe({
	base: 'flex items-center justify-between',
	size: {
		sm: 'mb-xs',
		md: 'mb-sm',
		lg: 'mb-md',
	},
	defaults: { size: 'md' },
})

const footer = defineRecipe({
	base: ['flex items-center justify-center'],
	size: {
		sm: 'pb-xs gap-xs',
		md: 'pb-xs gap-sm',
		lg: 'pb-md gap-md',
	},
	defaults: { size: 'md' },
})

const pickerGrid = defineRecipe({
	base: 'grid grid-cols-3',
	size: {
		sm: 'px-sm',
		md: 'px-md',
		lg: 'px-lg',
	},
	defaults: { size: 'md' },
})

const weekday = defineRecipe({
	base: ['flex items-center justify-center', 'w-full aspect-square', 'font-medium', iro.text.muted],
	size: {
		sm: ji.xs,
		md: ji.sm,
		lg: ji.md,
	},
	defaults: { size: 'md' },
})

export const k = {
	base,
	grid: 'grid grid-cols-7',
	header,
	footer,
	picker: {
		grid: pickerGrid,
		cellCurrent: ['font-semibold', soft.bg.blue, soft.text.blue, soft.hover.blue],
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
