import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

export type TableVariants = {
	dense?: boolean
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

const k = katachi.table

export const tableVariants = cva(k.base)

export const tableHeadVariants = cva(k.head)

export const tableHeaderVariants = cva(k.header)

export const tableRowVariants = cva(k.row)

export const tableCellVariants = cva(k.cell)

export const tableGridVariants = cva(k.grid)

export const tableStripedVariants = cva(k.striped)
