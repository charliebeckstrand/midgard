import { createContext } from '../../core'

export type TableContextValue = {
	bleed: boolean
	dense: boolean
	grid: boolean
	striped: boolean
}

export const [TableProvider, useTable] = createContext<TableContextValue>('Table')
