'use client'

import { createContext } from '../../core'

/**
 * Whether the enclosing {@link RadioGroup} is read-only. Each {@link Radio} in
 * the group reads it and blocks the check. The `ControlContext` cannot carry
 * the flag: a group with no `<Control>` above it has no id to give, and a
 * radio adopts the id of that context.
 *
 * @internal
 */
export const [RadioGroupReadOnlyContext, useRadioGroupReadOnly] = createContext<boolean>(
	'RadioGroupReadOnly',
	{ default: false },
)
