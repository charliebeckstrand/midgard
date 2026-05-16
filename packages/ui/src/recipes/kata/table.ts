import { tv } from 'tailwind-variants'
import { mode } from '../../core/recipe/mode'
import { iro } from '../ryu/iro'
import { sen } from '../ryu/sen'

const cellSize = {
	sm: 'px-xs py-xs',
	md: 'px-sm py-sm',
	lg: 'px-md py-md',
}

const grid = {
	true: ['border', sen.borderSubtleColor],
	false: '',
}

const tableCell = tv({
	base: [iro.text.default],
	variants: { size: cellSize, grid },
	defaultVariants: { size: 'md', grid: false },
})

const tableHeader = tv({
	base: ['font-bold', iro.text.muted],
	variants: { size: cellSize, grid },
	defaultVariants: { size: 'md', grid: false },
})

export const table = {
	base: 'w-full text-left text-base',
	head: [iro.text.muted, sen.borderSubtleColor],
	header: tableHeader,
	row: [],
	cell: tableCell,
	striped: mode('*:even:bg-zinc-950/2.5', 'dark:*:even:bg-white/2.5'),
}

export { table as k, tableCell as tableCellVariants, tableHeader as tableHeaderVariants }
