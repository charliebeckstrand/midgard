'use client'

import { useCallback, useRef, useState } from 'react'

type SetValue<T> = T | undefined | ((prev: T | undefined) => T | undefined)

/**
 * Manages controlled/uncontrolled value state.
 * When `value` is provided, the component is controlled.
 * When only `defaultValue` is provided, the component manages its own state.
 */
export function useControllable<T>(props: {
	value?: T | null
	defaultValue?: T
	onChange?: (value: T | undefined) => void
}): [T | undefined, (value: SetValue<T>) => void] {
	const { value, defaultValue, onChange } = props

	const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)

	const isControlled = value !== undefined

	const currentValue = isControlled ? (value ?? undefined) : internalValue

	const valueRef = useRef(currentValue)

	valueRef.current = currentValue

	const setValue = useCallback(
		(next: SetValue<T>) => {
			const resolved =
				typeof next === 'function'
					? (next as (prev: T | undefined) => T | undefined)(valueRef.current)
					: next

			setInternalValue(resolved)

			onChange?.(resolved)
		},
		[onChange],
	)

	return [currentValue, setValue]
}
