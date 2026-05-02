import { mode } from '../../core/recipe/mode'
import { iro } from '../ryu/iro'
import { sen } from '../ryu/sen'

export const table = {
	base: 'w-full text-left text-base/6',
	head: [iro.text.muted, sen.borderSubtleColor],
	header: ['font-bold', 'px-sm', 'py-sm', iro.text.muted],
	row: [],
	cell: ['px-sm', 'py-sm', iro.text.default],
	grid: ['border', sen.borderSubtleColor],
	striped: mode('*:even:bg-zinc-950/2.5', 'dark:*:even:bg-white/2.5'),
}
