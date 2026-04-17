'use client'

import { useCallback, useRef } from 'react'
import { useSelect } from './use-select'

type UseDeferredToggleOptions<T> = {
	multiple: boolean
	nullable: boolean
	setValue: (updater: (prev: T | T[] | undefined) => T | T[] | undefined) => void
}

/**
 * Wraps `useSelect` with a pending-value queue so a toggle can be deferred
 * until a panel finishes its exit animation — avoiding the jarring flicker
 * where the selected item visibly updates before the panel collapses.
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
	const toggle = useSelect({ multiple, nullable, setValue })

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
