'use client'

import { useCallback, useRef, useState } from 'react'

export type SetValue<T> = T | undefined | ((prev: T | undefined) => T | undefined)

type ControllableOptions<T> = {
	/** Controlled value. `undefined` leaves the hook uncontrolled; pass `null` to stay controlled with no current value. */
	value?: T | null
	/** Initial value when uncontrolled. Pass a thunk for a lazy initializer, evaluated once on mount (mirrors `useState`). */
	defaultValue?: T | (() => T)
	onValueChange?: (value: T | undefined) => void
}

/** Manages controlled / uncontrolled value state with a unified setter. */
export function useControllable<T>({
	value,
	defaultValue,
	onValueChange,
}: ControllableOptions<T>): [T | undefined, (value: SetValue<T>) => void] {
	const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)

	const isControlled = value !== undefined

	const currentValue = isControlled ? (value ?? undefined) : internalValue

	// Resolution base for functional updaters. Re-synced to the committed value
	// each render, but advanced eagerly on every `setValue` call so two updates
	// in one batch chain (`prev => …` sees the first update's result) instead of
	// both resolving against the same stale committed value.
	const valueRef = useRef(currentValue)

	valueRef.current = currentValue

	// The ref keeps the stable (empty-dep) setter reading live controlled-ness.
	const isControlledRef = useRef(isControlled)

	isControlledRef.current = isControlled

	const onValueChangeRef = useRef(onValueChange)

	onValueChangeRef.current = onValueChange

	const setValue = useCallback((next: SetValue<T>) => {
		const resolved =
			typeof next === 'function'
				? (next as (prev: T | undefined) => T | undefined)(valueRef.current)
				: next

		valueRef.current = resolved

		// Stale internal state surfaces as a jump if the consumer later drops
		// the `value` prop.
		if (!isControlledRef.current) setInternalValue(resolved)

		onValueChangeRef.current?.(resolved)
	}, [])

	return [currentValue, setValue]
}
