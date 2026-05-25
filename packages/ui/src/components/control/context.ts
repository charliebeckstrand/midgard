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
 * variant — every prop a nested form field can inherit. Special: it's also
 * the data bridge between `<Field>` (label, help, errors, validation) and
 * the underlying form field, so it carries more than just size.
 *
 * Resolution lives at the field's call site: shared form-field props go
 * through `useControlProps`; size is resolved separately through the
 * Density cascade.
 *
 * Read by input, textarea, switch, listbox, combobox, datepicker, checkbox,
 * radio.
 */
export const [ControlContext, useControl] = createContext<ControlContextValue | undefined>(
	'Control',
	{ default: undefined },
)
