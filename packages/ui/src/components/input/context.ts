'use client'

import { createContext, useContext } from 'react'

type InputSize = 'xs' | 'sm' | 'md' | 'lg'

const InputSizeContext = createContext<InputSize | undefined>(undefined)

export const InputSizeProvider = InputSizeContext.Provider

export function useInputSize(): InputSize | undefined {
	return useContext(InputSizeContext)
}
