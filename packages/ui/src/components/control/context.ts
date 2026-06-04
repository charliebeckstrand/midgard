'use client'

import { createContext } from '../../core'

export type ControlSize = 'sm' | 'md' | 'lg'
export type ControlVariant = 'default' | 'outline'

export type ControlContextValue = {
	id: string
	autoComplete?: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
	size?: ControlSize
	variant?: ControlVariant
	/** Composed `aria-describedby` for fields — registered Description / error Message ids, or undefined when none are rendered. */
	describedBy?: string
	/** Id the Description slot renders with. */
	descriptionId?: string
	/** Id the error Message slot renders with. */
	messageId?: string
	/** Slot registration — Description / error Message call these on mount so `describedBy` only references rendered ids. */
	registerDescription?: () => () => void
	registerMessage?: () => () => void
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
