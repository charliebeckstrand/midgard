'use client'

import { createContext, useContext } from 'react'

export type DlOrientation = 'horizontal' | 'vertical'

const DlContext = createContext<DlOrientation | undefined>(undefined)

export const DlProvider = DlContext.Provider

export function useDlOrientation(): DlOrientation {
	return useContext(DlContext) ?? 'horizontal'
}
