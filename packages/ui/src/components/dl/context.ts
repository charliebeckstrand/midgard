'use client'

import { createContext, useContext } from 'react'
import type { Orientation } from '../../types'

export type DlOrientation = Orientation

const DlContext = createContext<DlOrientation | undefined>(undefined)

export const DlProvider = DlContext.Provider

export function useDlOrientation(): DlOrientation {
	return useContext(DlContext) ?? 'horizontal'
}
