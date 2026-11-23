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
