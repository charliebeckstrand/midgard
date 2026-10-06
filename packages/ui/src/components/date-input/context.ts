'use client'

import { createContext } from '../../core'
import { useFormResets } from '../form/context'

/**
 * Carries a Form reset count to a {@link DateInput} that has no `name`. A
 * picker that binds a Form field, and puts a DateInput without a `name` in it,
 * provides the reset count of its Form here. Thus a reset of that Form drops
 * the typed text of the DateInput. The barrel does not export this context.
 *
 * @internal
 */
export const [DateInputResetContext, useDateInputResetContext] = createContext<number>(
	'DateInputReset',
	{ default: 0 },
)

/**
 * Returns the Form reset count that drops the typed text of a {@link DateInput}.
 *
 * @param name - The bound Form field of the control, if any.
 * @returns The reset count of the enclosing Form for a control with a `name`.
 * Else the count from {@link DateInputResetContext}, which is `0` outside a
 * provider.
 * @internal
 */
export function useDateInputResets(name: string | undefined): number {
	const formResets = useFormResets()

	const inherited = useDateInputResetContext()

	return name === undefined ? inherited : formResets
}
