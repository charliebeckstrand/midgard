'use client'

import { createContext } from '../../core'

/** Control density step: `sm`, `md`, or `lg`. Feeds the Density cascade and each field's recipe size. */
export type ControlSize = 'sm' | 'md' | 'lg'

/** Visual treatment shared across a Control's fields: `default` (filled) or `outline`. */
export type ControlVariant = 'default' | 'outline'

/**
 * Shape of the form-field cascade carried by {@link ControlContext}: the shared
 * inherited props plus the `<Field>` a11y wiring (slot ids, registrars, composed
 * `aria-labelledby` / `aria-describedby`).
 *
 * @see {@link useControl} for the consumer hook.
 */
export type ControlContextValue = {
	id: string
	autoComplete?: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
	size?: ControlSize
	variant?: ControlVariant
	/** Composed `aria-describedby` for fields: registered Description / error Message ids, or undefined when none are rendered. */
	describedBy?: string
	/** Composed `aria-labelledby`: the Label's id once it registers. Lets a portalled popup (a listbox) name itself from the field's Label. */
	labelledBy?: string
	/** Id the Label slot renders with. */
	labelId?: string
	/** Id the Description slot renders with. */
	descriptionId?: string
	/** Id the error Message slot renders with. */
	messageId?: string
	/** `true` while an error Message is mounted; fields OR this into `aria-invalid`. */
	messageRegistered?: boolean
	/** Slot registration: Label / Description / error Message call these on mount, passing the id they render; `labelledBy` / `describedBy` only reference ids of rendered slots. */
	registerLabel?: (renderedId?: string) => () => void
	registerDescription?: (renderedId?: string) => () => void
	registerMessage?: (renderedId?: string) => () => void
}

/**
 * Form-field cascade. Provided by `<Control>` (and `<Field>` on its behalf).
 * Carries id, autoComplete, disabled, invalid, readOnly, required, size,
 * variant: every prop a nested form field can inherit. Also the data bridge
 * between `<Field>` (label, help, errors, validation) and the underlying
 * form field.
 *
 * Resolution lives at the field's call site: shared form-field props go
 * through `useControlProps`; the Density cascade resolves size separately.
 *
 * Read by input, textarea, switch, listbox, combobox, datepicker, checkbox,
 * radio.
 *
 * @returns The enclosing {@link ControlContextValue}, or `undefined` when no
 * `<Control>` / `<Field>` is mounted above the caller.
 * @see {@link useControlProps} for the shared resolution helper.
 */
export const [ControlContext, useControl] = createContext<ControlContextValue | undefined>(
	'Control',
	{ default: undefined },
)
