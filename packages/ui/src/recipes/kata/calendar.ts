import { iro } from '../iro'
import { kumi } from '../kumi'
import { buttonSoft } from './button'

export const calendar = {
	base: ['inline-flex flex-col w-80 p-4', 'select-none'],
	grid: 'grid grid-cols-7',
	header: ['flex items-center justify-between', 'mb-2'],
	footer: ['flex', 'items-center justify-center', kumi.gap.md, 'pb-4'],
	nav: {
		icon: 'size-4.5',
	},
	picker: {
		grid: ['grid grid-cols-3 p-2', kumi.gap.sm],
		cellCurrent: ['font-semibold', ...buttonSoft.blue],
	},
	weekday: [
		'flex',
		'items-center justify-center',
		'w-full aspect-square',
		'text-xs font-medium',
		iro.text.muted,
	],
	day: {
		base: 'w-full aspect-square p-0 ring-inset',
		active: 'ring-2 ring-inset ring-blue-600',
		activeSelected: 'bg-blue-600',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
}
