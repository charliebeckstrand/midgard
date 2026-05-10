'use client'

import { createContext } from '../../core'

type AlertVariant = 'solid' | 'soft' | 'outline' | 'plain'
type AlertColor = 'zinc' | 'red' | 'amber' | 'green' | 'blue'

export type AlertContextValue = {
	variant: AlertVariant
	color: AlertColor
}

export const [AlertProvider, useAlertContext] = createContext<AlertContextValue | undefined>(
	'Alert',
	{ default: undefined },
)
