import { kage } from '../kage'
import { ma } from '../ma'
import { nuri } from '../nuri'
import { sumi } from '../sumi'

export const table = {
	base: 'w-full text-left text-base/6',
	head: [sumi.textMuted, kage.borderSubtleColor],
	header: ['font-bold', ma.density.px.md, ma.density.py.md, sumi.textMuted],
	row: [],
	cell: [ma.density.px.md, ma.density.py.md, sumi.text],
	grid: ['border', kage.borderSubtleColor],
	striped: nuri.tableStriped,
}
