'use client'

import { createContext, useContext } from 'react'
import type { Size } from '../../types'

const ButtonSizeContext = createContext<Size | undefined>(undefined)

export const ButtonSizeProvider = ButtonSizeContext.Provider

export function useButtonSize(): Size | undefined {
	return useContext(ButtonSizeContext)
}
