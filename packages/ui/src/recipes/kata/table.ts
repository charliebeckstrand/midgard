import { mode } from '../../core/recipe/mode'
import { iro } from '../ryu/iro'
import { sen } from '../ryu/sen'
import type { Step } from '../ryu/sun'

export const table = {
	base: 'w-full text-left text-base',
	head: [iro.text.muted, sen.borderSubtleColor],
	header: ['font-bold', iro.text.muted],
	row: [],
	cell: [iro.text.default],
	cellSize: {
		sm: 'px-xs py-xs',
		md: 'px-sm py-sm',
		lg: 'px-md py-md',
	} as Record<Step, string>,
	grid: ['border', sen.borderSubtleColor],
	striped: mode('*:even:bg-zinc-950/2.5', 'dark:*:even:bg-white/2.5'),
}

export { table as k }
