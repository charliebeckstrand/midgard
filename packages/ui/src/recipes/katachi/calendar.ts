import { narabi } from '../narabi'
import { nuri } from '../nuri'
import { sumi } from '../sumi'

export const calendar = {
	root: 'inline-flex flex-col p-3 select-none min-w-72 [&:not(:has(+[data-slot=calendar-footer]))]:pb-4',
	header: 'flex items-center justify-between mb-2',
	picker: {
		grid: 'grid grid-cols-3 gap-1 p-2',
		cellCurrent: ['font-semibold', ...nuri.buttonSoft.blue],
	},
	navIcon: 'size-4.5',
	grid: 'grid grid-cols-7',
	weekday: [sumi.textMuted, narabi.center.flex, 'size-9 text-xs font-medium'],
	footer: `${narabi.center.flex} gap-2 px-3 pb-3`,
	day: {
		active: 'ring-2 ring-inset ring-blue-600',
		activeSelected: 'bg-blue-500',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
}
