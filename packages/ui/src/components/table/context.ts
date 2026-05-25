import { createContext } from '../../core'
import type { Step } from '../../recipes'

export type TableContextValue = {
	size: Step
	grid: boolean
	striped: boolean
}

export const [TableContext, useTable] = createContext<TableContextValue>('Table')
