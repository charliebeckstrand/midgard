import { createContext } from '../../core'
import type { Step } from '../../core/recipe'

export type TableContextValue = {
	size: Step
	grid: boolean
	striped: boolean
}

export const [TableProvider, useTable] = createContext<TableContextValue>('Table')
