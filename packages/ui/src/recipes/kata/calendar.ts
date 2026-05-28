import { defineRecipe } from '../../core/recipe'
import { iro, ji, narabi, sen } from '../kiso'

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
	base: [narabi.row, 'justify-between'],
	size: {
		sm: 'mb-1',
		md: 'mb-2',
		lg: 'mb-3',
	},
	defaults: { size: 'md' },
})

const footer = defineRecipe({
	base: [narabi.row, 'justify-center'],
	size: {
		sm: 'pb-1 gap-1',
		md: 'pb-1 gap-2',
		lg: 'pb-3 gap-3',
	},
	defaults: { size: 'md' },
})

const pickerGrid = defineRecipe({
	base: 'grid grid-cols-3',
	size: {
		sm: 'px-2',
		md: 'px-3',
		lg: 'px-4',
	},
	defaults: { size: 'md' },
})

const weekday = defineRecipe({
	base: [narabi.row, 'justify-center', 'w-full aspect-square', ji.weight.medium, iro.text.muted],
	size: {
		sm: ji.size.xs,
		md: ji.size.sm,
		lg: ji.size.md,
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
		cellCurrent: [ji.weight.semibold, soft.bg.blue, soft.text.blue, soft.hover.blue],
	},
	weekday,
	day: {
		base: 'w-full ring-inset',
		active: [...sen.focus.ring],
		activeSelected: 'bg-blue-600',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
} as const
