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

/**
 * Form-field cascade. Provided by `<Control>` (and `<Field>` on its behalf).
 * Carries id, autoComplete, disabled, invalid, readOnly, required, size,
 * variant — every prop a nested form field can inherit.
 *
 * Read by input, textarea, switch, listbox, combobox, datepicker, checkbox,
 * radio. See `src/docs/CASCADES.md` for the full chain.
 */
export const [ControlProvider, useControl] = createContext<ControlContextValue | undefined>(
	'Control',
	{ default: undefined },
)
