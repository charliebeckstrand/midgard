import { createContext } from '../../core'
import type { DensityLevel } from '../../providers/density'

export type TableContextValue = {
	density: DensityLevel
	bleed: boolean
	grid: boolean
	striped: boolean
}

export const [TableProvider, useTable] = createContext<TableContextValue>('Table')
