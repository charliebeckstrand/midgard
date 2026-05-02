'use client'

import { createContext, useContext } from 'react'
import type { Size } from '../../types'

const InputSizeContext = createContext<Size | undefined>(undefined)

export const InputSizeProvider = InputSizeContext.Provider

export function useInputSize(): Size | undefined {
	return useContext(InputSizeContext)
}
