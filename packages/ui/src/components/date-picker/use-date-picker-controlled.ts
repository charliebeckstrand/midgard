'use client'

import { useRef } from 'react'

/**
 * Bridges the date picker's optional `value` prop to {@link useControllable}'s
 * `null`-means-controlled-empty convention.
 *
 * `useControllable` reads `value === undefined` as "uncontrolled". A controlled
 * picker clears by emitting `onValueChange(undefined)`, so the consumer feeds
 * `value={undefined}` back — which would silently flip the field to uncontrolled
 * and resurface the stale internal value, taking a second clear to actually
 * empty it. Once a defined value has been seen the field stays controlled, and a
 * later `undefined` is forwarded as `null` (a controlled clear) instead.
 */
export function useDatePickerControlled<T>(value: T | undefined): T | null | undefined {
	const controlled = useRef(false)

	if (value !== undefined) controlled.current = true

	return controlled.current ? (value ?? null) : undefined
}
