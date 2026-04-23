import { mode } from '../../core/recipe/mode'
import { iro } from '../iro'
import { ma } from '../ma'
import { sen } from '../sen'

export const table = {
	base: 'w-full text-left text-base/6',
	head: [iro.text.muted, sen.borderSubtleColor],
	header: ['font-bold', ma.px.md, ma.py.md, iro.text.muted],
	row: [],
	cell: [ma.px.md, ma.py.md, iro.text.default],
	grid: ['border', sen.borderSubtleColor],
	striped: mode('*:even:bg-zinc-950/2.5', 'dark:*:even:bg-white/2.5'),
}
