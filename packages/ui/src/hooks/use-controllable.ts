'use client'

import { useCallback, useState } from 'react'

/**
 * Manages controlled/uncontrolled value state.
 * When `value` is provided, the component is controlled.
 * When only `defaultValue` is provided, the component manages its own state.
 */
export function useControllable<T>(props: {
	value?: T
	defaultValue?: T
	onChange?: (value: T) => void
}): [T | undefined, (value: T) => void] {
	const { value, defaultValue, onChange } = props
	
	const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)

	const currentValue = value !== undefined ? value : internalValue

	const setValue = useCallback(
		(newValue: T) => {
			if (value === undefined) setInternalValue(newValue)
			onChange?.(newValue)
		},
		[value, onChange],
	)

	return [currentValue, setValue]
}
