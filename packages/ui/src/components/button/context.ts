'use client'

import { createContext, useContext } from 'react'

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const ButtonSizeContext = createContext<ButtonSize | undefined>(undefined)

export const ButtonSizeProvider = ButtonSizeContext.Provider

export function useButtonSize(): ButtonSize | undefined {
	return useContext(ButtonSizeContext)
}
