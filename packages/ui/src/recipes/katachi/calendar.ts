import { kumi } from '../kumi'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { take } from '../take'

export const calendar = {
	base: ['inline-flex flex-col w-80 p-4', 'select-none'],
	grid: 'grid grid-cols-7',
	header: ['flex items-center justify-between', 'mb-2'],
	footer: ['flex', kumi.center, take.gap.md, 'pb-4'],
	nav: {
		icon: 'size-4.5',
	},
	picker: {
		grid: ['grid grid-cols-3 p-2', take.gap.sm],
		cellCurrent: ['font-semibold', ...nuri.buttonSoft.blue],
	},
	weekday: ['flex', kumi.center, 'w-full aspect-square', 'text-xs font-medium', sumi.textMuted],
	day: {
		base: 'w-full aspect-square p-0 ring-inset',
		active: 'ring-2 ring-inset ring-blue-600',
		activeSelected: 'bg-blue-600',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
}
