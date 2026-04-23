'use client'

import { useCallback, useRef } from 'react'

type UseDeferredToggleOptions<T> = {
	multiple: boolean
	nullable: boolean
	setValue: (updater: (prev: T | T[] | undefined) => T | T[] | undefined) => void
}

/**
 * Toggle logic for Listbox / Combobox selection, wrapped with a pending-value
 * queue so a toggle can be deferred until a panel finishes its exit animation —
 * avoiding the jarring flicker where the selected item visibly updates before
 * the panel collapses.
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
					const arr = (Array.isArray(prev) ? prev : []) as T[]

					return arr.includes(newValue) ? arr.filter((v) => v !== newValue) : [...arr, newValue]
				}

				if (nullable && prev === newValue) return undefined

				return newValue as T | T[]
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
