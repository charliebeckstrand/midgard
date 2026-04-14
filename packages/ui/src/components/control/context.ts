'use client'

import { createContext, useContext } from 'react'

export type ControlSize = 'sm' | 'md' | 'lg'
export type ControlVariant = 'default' | 'outline' | 'glass'

export type ControlContextValue = {
	id: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
	size?: ControlSize
	variant?: ControlVariant
}

const ControlContext = createContext<ControlContextValue | undefined>(undefined)

export const ControlProvider = ControlContext.Provider

/** Returns the nearest Control context, or undefined outside a Control. */
export function useControl() {
	return useContext(ControlContext)
}
