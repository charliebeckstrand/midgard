import { cva, type VariantProps } from 'class-variance-authority'
import { kage, sumi } from '../../recipes'

export const tableVariants = cva('w-full text-left text-base/6', {
	variants: {
		dense: {
			true: '',
			false: '',
		},
		bleed: {
			true: '',
			false: '',
		},
		grid: {
			true: '',
			false: '',
		},
		striped: {
			true: '',
			false: '',
		},
	},
	defaultVariants: {
		dense: false,
		bleed: false,
		grid: false,
		striped: false,
	},
})

export type TableVariants = VariantProps<typeof tableVariants>

export const tableHeadVariants = cva(sumi.usui)

export const tableHeaderVariants = cva(['border-b px-4 py-2 font-medium', kage.usui, sumi.usui])

export const tableBodyVariants = cva('')

export const tableRowVariants = cva(['border-b last:border-b-0', kage.usui])

export const tableCellVariants = cva(['px-4 py-2', sumi.base])

export const tableRowStripedVariants = cva('even:bg-zinc-950/2.5 dark:even:bg-white/2.5')

export const tableGridVariants = cva(['border-l first:border-l-0', kage.usui])
