import { mode } from '../../core/recipe/mode'
import type { DensityLevel } from '../../providers/density'
import { iro } from '../ryu/iro'
import { sen } from '../ryu/sen'

export const table = {
	base: 'w-full text-left text-base',
	head: [iro.text.muted, sen.borderSubtleColor],
	header: ['font-bold', iro.text.muted],
	row: [],
	cell: [iro.text.default],
	cellDensity: {
		compact: 'px-xs py-xs',
		snug: 'px-sm py-sm',
		loose: 'px-md py-md',
	} as Record<DensityLevel, string>,
	grid: ['border', sen.borderSubtleColor],
	striped: mode('*:even:bg-zinc-950/2.5', 'dark:*:even:bg-white/2.5'),
}

export { table as k }
