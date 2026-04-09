'use client'

import { createContext as reactCreateContext, useContext } from 'react'

type AlertVariant = 'solid' | 'soft' | 'outline' | 'plain'
type AlertColor = 'zinc' | 'red' | 'amber' | 'green' | 'blue'

export type AlertContextValue = {
	variant: AlertVariant
	color: AlertColor
}

const AlertContext = reactCreateContext<AlertContextValue | null>(null)

export const AlertProvider = AlertContext.Provider

export function useAlertContext(): AlertContextValue | undefined {
	return useContext(AlertContext) ?? undefined
}
