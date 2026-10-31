'use client'

import { useMemo } from 'react'
import { useControllable } from '../../hooks'
import type { CurrentContextValue } from './context'

/**
 * Controlled / uncontrolled state owner for the current-panel cascade.
 *
 * @returns A memoized {@link CurrentContextValue} to pass straight into
 * {@link CurrentContext}; `value` follows the controlled prop or internal state
 * via `useControllable`. A controlled `null` stays `null`.
 */
export function useCurrentState(props: {
	/** Controlled active value. `undefined` leaves it uncontrolled; `null` keeps it controlled with none active (CONVENTIONS §7.3). */
	value?: string | null
	defaultValue?: string
	onValueChange?: (value: string | null) => void
}): CurrentContextValue {
	const [value, setValue] = useControllable({
		value: props.value,
		defaultValue: props.defaultValue,
		onValueChange: props.onValueChange,
	})

	// `useControllable` folds `null` into `undefined`. Carry the controlled
	// `null` past it, so "none active" does not read as an unvalued context.
	const contextValue = props.value === null ? null : value

	return useMemo<CurrentContextValue>(
		() => ({ value: contextValue, onValueChange: setValue }),
		[contextValue, setValue],
	)
}
