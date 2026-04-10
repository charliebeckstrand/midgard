import { nuri } from '../nuri'
import { sumi } from '../sumi'

export const calendar = {
	root: 'inline-flex flex-col p-3 select-none min-w-72',
	header: 'flex items-center justify-between mb-2',
	picker: {
		grid: 'grid grid-cols-3 gap-1 p-2',
		cellCurrent: ['font-semibold', ...nuri.buttonSoft.blue],
	},
	navIcon: 'size-4.5',
	grid: 'grid grid-cols-7',
	weekday: [sumi.textMuted, 'flex items-center justify-center size-9 text-xs font-medium'],
	day: {
		active: 'ring-2 ring-inset ring-blue-600',
		activeSelected: 'bg-blue-500',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
}
