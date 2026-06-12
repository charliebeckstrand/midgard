import { defineRecipe } from '../../core/recipe'
import { iro, ji, kokkaku, narabi, sen } from '../kiso'

const { palette, text } = iro
const { size, weight } = ji
const { flex } = narabi
const { focus } = sen

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
	base: [flex.row, 'justify-between'],
	size: {
		sm: 'mb-1',
		md: 'mb-2',
		lg: 'mb-3',
	},
	defaults: { size: 'md' },
})

const footer = defineRecipe({
	base: [flex.row, 'justify-center'],
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
	base: [flex.row, 'justify-center', 'w-full aspect-square', weight.medium, text.muted],
	size: {
		sm: size.xs,
		md: size.sm,
		lg: size.md,
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
		cellCurrent: [
			weight.semibold,
			palette.soft.bg.blue,
			palette.soft.text.blue,
			palette.soft.hover.blue,
		],
	},
	weekday,
	day: {
		base: 'w-full ring-inset',
		active: [...focus.virtual],
		activeSelected: ['bg-blue-600', ...focus.virtual],
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
	skeleton: kokkaku.calendar,
} as const
