import { cva } from 'class-variance-authority'
import { kage, sumi } from '../../recipes'

export type TableVariants = {
	dense?: boolean
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

export const tableVariants = cva('w-full text-left text-base/6')

export const tableHeadVariants = cva(sumi.muted)

export const tableHeaderVariants = cva([
	'border-b px-4 py-2 font-semibold',
	kage.subtle,
	sumi.muted,
])

export const tableRowVariants = cva(['border-b last:border-b-0', kage.subtle])

export const tableCellVariants = cva(['px-4 py-2', sumi.base])

export const tableGridVariants = cva(['border-l first:border-l-0', kage.subtle])
