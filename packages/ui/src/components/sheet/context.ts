import { createContext } from '../../core'

export type SheetSide = 'top' | 'bottom' | 'left' | 'right'

export interface SheetContextValue {
	open: boolean
	onOpenChange: (open: boolean) => void
	side: SheetSide
	modal: boolean
	titleId: string
	descriptionId: string
}

export const [SheetProvider, useSheet] = createContext<SheetContextValue>('Sheet')
