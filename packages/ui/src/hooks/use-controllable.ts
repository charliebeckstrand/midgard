'use client'

import { useCallback, useState } from 'react'

/**
 * Manages controlled/uncontrolled value state.
 * When `value` is provided, the component is controlled.
 * When only `defaultValue` is provided, the component manages its own state.
 */
export function useControllable<T>(props: {
	value?: T | null
	defaultValue?: T
	onChange?: (value: T | undefined) => void
}): [T | undefined, (value: T | undefined) => void] {
	const { value, defaultValue, onChange } = props

	const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)

	const isControlled = value !== undefined

	const currentValue = isControlled ? (value ?? undefined) : internalValue

	const setValue = useCallback(
		(newValue: T | undefined) => {
			if (!isControlled) setInternalValue(newValue)

			onChange?.(newValue)
		},
		[isControlled, onChange],
	)

	return [currentValue, setValue]
}
