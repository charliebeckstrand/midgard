'use client'

import { createContext, type Severity } from '../../core'

/** Visual treatment shared across a Control's fields: `default` (filled) or `outline`. */
export type ControlVariant = 'default' | 'outline'

/** Control-level validation / status severity broadcast by `<Control severity>` / `<Field severity>`: an `error`, `warning`, or `success`. */
export type ControlSeverity = Severity

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
	readOnly?: boolean
	required?: boolean
	/** Validation / status severity from `<Control severity>` / `<Field severity>`; control-aware fields map it to the matching `data-*` validation ring (and `error` additionally to `aria-invalid`). */
	severity?: ControlSeverity
	variant?: ControlVariant
	/** Composed `aria-describedby` for fields: registered Description / error or warning Message ids, or undefined when none are rendered. */
	describedBy?: string
	/** Composed `aria-labelledby`: the Label's id once it registers. Lets a portaled popup (a listbox) name itself from the field's Label. */
	labelledBy?: string
	/** Id the Label slot renders with. */
	labelId?: string
	/** Id the Description slot renders with. */
	descriptionId?: string
	/** Id the error Message slot renders with. */
	messageId?: string
	/** Slot registration: Label / Description / error or warning Message call these on mount, passing the id they render; `labelledBy` / `describedBy` only reference ids of rendered slots. */
	registerLabel?: (renderedId?: string) => () => void
	registerDescription?: (renderedId?: string) => () => void
	registerMessage?: (renderedId?: string) => () => void
}

/**
 * Form-field cascade. Provided by `<Control>` (and `<Field>` on its behalf).
 * Carries id, autoComplete, disabled, readOnly, required, severity, and
 * variant: every prop a nested form field can inherit. Also the data bridge
 * between `<Field>` (label, help, errors, validation) and the underlying
 * form field.
 *
 * Resolution lives at the field's call site: shared form-field props go
 * through `useControlProps`. The size is not in the context: a set `size`
 * makes the control a density scope, and each field takes its step in CSS.
 *
 * @returns The enclosing {@link ControlContextValue}, or `undefined` when no
 * `<Control>` / `<Field>` is mounted above the caller.
 * @see {@link useControlProps} for the shared resolution helper.
 */
export const [ControlContext, useControl] = createContext<ControlContextValue | undefined>(
	'Control',
	{ default: undefined },
)

/**
 * Whether the enclosing scope is locked. A locked scope shows its fields as
 * read-only, and makes its buttons inert, while each part keeps the focus.
 *
 * @returns The flag of the nearest scope, or `false` outside a scope.
 * @remarks The nearest scope wins, so a scope inside a locked one can unlock
 * its own parts. A `Form` locks its parts while a submit runs, and a filter bar
 * inside it unlocks its own. The scope reads no form, so any region can lock.
 * @internal
 */
export const [ControlLockContext, useControlLock] = createContext<boolean>('ControlLock', {
	default: false,
})

/**
 * A registry of the control ids of named fields, such as the registry of a
 * form. A control registers the id of its field under the name of the field.
 *
 * @internal
 */
export type ControlTargets = {
	/** Registers the control id of a field, and returns the function that removes it. */
	register: (name: string, id: string) => () => void
}

/**
 * The nearest registry of control ids, or `undefined` outside one.
 *
 * @remarks A `Form` provides one, so a `FormErrorSummary` can link a field to
 * its control. A filter bar inside a `Form` provides none, so its fields do
 * not register with the form.
 * @internal
 */
export const [ControlTargetsContext, useControlTargets] = createContext<ControlTargets | undefined>(
	'ControlTargets',
	{ default: undefined },
)
