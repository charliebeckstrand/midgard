'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type DeferredToggleOptions<T> = {
	/** Multi-select mode: the held value is an array and toggling adds / removes entries. */
	multiple: boolean
	/** Single-select mode: toggling the active value clears the selection. Ignored when `multiple` is true. */
	nullable: boolean
	/** Current control value; the menu freezes a snapshot of this while it closes. */
	value: T | T[] | undefined
	/** Setter for the underlying value, called with an updater that receives the previous value. */
	setValue: (updater: (prev: T | T[] | undefined) => T | T[] | undefined) => void
	/**
	 * Whether the menu is open. A transition back to `true` clears the freeze;
	 * a reopen interrupts the exit animation and `onExitComplete` (and thus
	 * `flushPending`) never fires.
	 */
	open?: boolean
}

/**
 * Toggle logic for Listbox / Combobox selection. Selecting writes the new value
 * to the control immediately; the value the *menu* renders as selected stays
 * frozen at a snapshot taken at selection time until the panel finishes its
 * exit animation, holding the selected row steady during the ~300ms close.
 *
 * Read `selectionValue` for the menu's selected state and wire `flushPending` to
 * `AnimatePresence`'s `onExitComplete` (or equivalent). Use `toggle` directly for
 * cases that stay open (e.g. multi-select), where the selection updates live.
 */
export function useDeferredToggle<T>({
	multiple,
	nullable,
	value,
	setValue,
	open,
}: DeferredToggleOptions<T>) {
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

	// Snapshot of the value the menu paints as selected while the panel animates
	// closed. `null` means "track the live value".
	const [frozen, setFrozen] = useState<{ value: T | T[] | undefined } | null>(null)

	const commit = useCallback(
		(newValue: T) => {
			setFrozen({ value })

			toggle(newValue)
		},
		[value, toggle],
	)

	const flushPending = useCallback(() => {
		setFrozen(null)
	}, [])

	// Clear the freeze when the menu reopens: an interrupted exit (reopen
	// mid-close) skips onExitComplete and flushPending never runs.
	const prevOpenRef = useRef(open)

	useEffect(() => {
		const wasOpen = prevOpenRef.current

		prevOpenRef.current = open

		if (open && !wasOpen) setFrozen(null)
	}, [open])

	const selectionValue = frozen ? frozen.value : value

	return { toggle, commit, flushPending, selectionValue }
}
