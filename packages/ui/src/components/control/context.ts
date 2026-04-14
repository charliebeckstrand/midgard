'use client'

import { createContext, useContext } from 'react'

export type ControlContextValue = {
	id: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
}

const ControlContext = createContext<ControlContextValue | undefined>(undefined)

export const ControlProvider = ControlContext.Provider

/**
 * Returns the nearest Control context, or `undefined` when outside a `<Control>`.
 * Components call this to inherit id, disabled, invalid, readOnly, and required
 * state from a parent Control wrapper.
 */
export function useControl() {
	return useContext(ControlContext)
}
