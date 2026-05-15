'use client'

import { createContext } from '../../core'

type SheetContextValue = {
	close: () => void
}

export const [SheetProvider, useSheetContext] = createContext<SheetContextValue>('Sheet')
