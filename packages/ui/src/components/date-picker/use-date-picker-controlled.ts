'use client'

import { useState } from 'react'

/**
 * Bridges the date picker's optional `value` prop to {@link useControllable}'s
 * `null`-means-controlled-empty convention.
 *
 * `useControllable` reads `value === undefined` as "uncontrolled". A controlled
 * picker clears by emitting `onValueChange(undefined)`, and the consumer feeds
 * `value={undefined}` back. That would flip the field to uncontrolled,
 * resurface the stale internal value, and take a second clear to empty it.
 * After the first defined value the field stays controlled; a later
 * `undefined` forwards as `null` (a controlled clear).
 */
export function useDatePickerControlled<T>(value: T | undefined): T | null | undefined {
	// Adjusted during render: the first render with a defined value reads it.
	const [controlled, setControlled] = useState(value !== undefined)

	if (value !== undefined && !controlled) setControlled(true)

	return controlled || value !== undefined ? (value ?? null) : undefined
}
