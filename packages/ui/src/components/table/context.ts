import { createContext } from '../../core'
import type { Step } from '../../recipes/ryu/sun'

export type TableContextValue = {
	size: Step
	bleed: boolean
	grid: boolean
	striped: boolean
}

export const [TableProvider, useTable] = createContext<TableContextValue>('Table')
