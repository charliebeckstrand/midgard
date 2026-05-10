'use client'

import { createContext } from '../../core'

export type ControlSize = 'sm' | 'md' | 'lg'
export type ControlVariant = 'default' | 'outline' | 'glass'

export type ControlContextValue = {
	id: string
	autoComplete?: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
	size?: ControlSize
	variant?: ControlVariant
}

/** Returns the nearest Control context, or undefined outside a Control. */
export const [ControlProvider, useControl] = createContext<ControlContextValue | undefined>(
	'Control',
	{ default: undefined },
)
