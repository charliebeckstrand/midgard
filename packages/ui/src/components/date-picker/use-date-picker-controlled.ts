'use client'

import { useRef } from 'react'

/**
 * Bridges the date picker's optional `value` prop to {@link useControllable}'s
 * `null`-means-controlled-empty convention.
 *
 * `useControllable` reads `value === undefined` as "uncontrolled". A controlled
 * picker clears by emitting `onValueChange(undefined)`, and the consumer feeds
 * `value={undefined}` back, which would flip the field to uncontrolled,
 * resurface the stale internal value, and take a second clear to empty it.
 * After the first defined value the field stays controlled; a later
 * `undefined` forwards as `null` (a controlled clear).
 */
export function useDatePickerControlled<T>(value: T | undefined): T | null | undefined {
	const controlled = useRef(false)

	if (value !== undefined) controlled.current = true

	return controlled.current ? (value ?? null) : undefined
}
