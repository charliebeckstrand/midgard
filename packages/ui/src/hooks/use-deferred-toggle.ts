'use client'

import { useCallback, useRef } from 'react'

export type UseDeferredToggleOptions<T> = {
	/** Multi-select mode — the held value is an array and toggling adds / removes entries. */
	multiple: boolean
	/** Single-select mode — toggling the active value clears the selection. Ignored when `multiple` is true. */
	nullable: boolean
	/** Setter for the underlying value, called with an updater that receives the previous value. */
	setValue: (updater: (prev: T | T[] | undefined) => T | T[] | undefined) => void
}

/**
 * Toggle logic for Listbox / Combobox selection, wrapped with a pending-value
 * queue so the toggle can be deferred until a panel finishes its exit
 * animation — keeping the selected item stable while the panel collapses.
 *
 * Call `enqueue(value)` to queue a toggle, then wire `flushPending` to
 * `AnimatePresence`'s `onExitComplete` (or equivalent). Use `toggle` directly
 * for cases that should update synchronously (e.g. multi-select).
 */
export function useDeferredToggle<T>({
	multiple,
	nullable,
	setValue,
}: UseDeferredToggleOptions<T>) {
	const toggle = useCallback(
		(newValue: T) => {
			setValue((prev) => {
				if (multiple) {
					const arr: T[] = Array.isArray(prev) ? prev : []

					return arr.includes(newValue) ? arr.filter((v) => v !== newValue) : [...arr, newValue]
				}

				if (nullable && prev === newValue) return undefined

				return newValue
			})
		},
		[multiple, nullable, setValue],
	)

	const pendingRef = useRef<{ value: T } | null>(null)

	const enqueue = useCallback((value: T) => {
		pendingRef.current = { value }
	}, [])

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			toggle(pendingRef.current.value)

			pendingRef.current = null
		}
	}, [toggle])

	return { toggle, enqueue, flushPending }
}
