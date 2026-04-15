import { kage } from '../kage'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { take } from '../take'

export const table = {
	base: 'w-full text-left text-base/6',
	head: [sumi.textMuted, kage.borderSubtleColor],
	header: ['font-bold', take.px.md, take.py.md, sumi.textMuted],
	row: [],
	cell: [take.px.md, take.py.md, sumi.text],
	grid: ['border', kage.borderSubtleColor],
	striped: nuri.tableStriped,
}
