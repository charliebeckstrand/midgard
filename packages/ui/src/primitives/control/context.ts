'use client'

import { createContext } from '../../core/create-context'

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
 * Whether an enclosing `Fieldset` is disabled. A native `<fieldset disabled>`
 * disables only the form-associated elements in it. This flag carries the state
 * to each control of the Control cascade, such as a canvas or a slider track.
 *
 * @returns `true` in a disabled Fieldset, or `false` outside one.
 * @remarks A Fieldset ORs its own `disabled` with this flag. Thus a Fieldset in
 * a disabled Fieldset cannot enable its controls, as in HTML.
 * @internal
 */
export const [ControlDisabledContext, useControlDisabled] = createContext<boolean>(
	'ControlDisabled',
	{ default: false },
)
