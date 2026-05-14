'use client'

import { useCallback, useRef, useState } from 'react'

type SetValue<T> = T | undefined | ((prev: T | undefined) => T | undefined)

export type UseControllableOptions<T> = {
	value?: T | null
	defaultValue?: T
	onChange?: (value: T | undefined) => void
}

/** Manages controlled / uncontrolled value state with a unified setter. */
export function useControllable<T>({
	value,
	defaultValue,
	onChange,
}: UseControllableOptions<T>): [T | undefined, (value: SetValue<T>) => void] {
	const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)

	const isControlled = value !== undefined

	const currentValue = isControlled ? (value ?? undefined) : internalValue

	const valueRef = useRef(currentValue)

	valueRef.current = currentValue

	const onChangeRef = useRef(onChange)

	onChangeRef.current = onChange

	const setValue = useCallback((next: SetValue<T>) => {
		const resolved =
			typeof next === 'function'
				? (next as (prev: T | undefined) => T | undefined)(valueRef.current)
				: next

		setInternalValue(resolved)

		onChangeRef.current?.(resolved)
	}, [])

	return [currentValue, setValue]
}
