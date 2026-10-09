'use client'

import { useCallback } from 'react'
import { toggleListItem } from '../utilities'
import { useFrozenOnClose } from './use-frozen-on-close'
import { useStableEvent } from './use-stable-event'

/** Options for {@link useDeferredToggle}: the flag it mirrors and how long it holds the old value. */
export type DeferredToggleOptions<T> = {
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
	 * `flushPending`) never fires. While it is `true`, `selectionValue` gives the
	 * live value, because a controlled owner can keep the menu open after a pick.
	 */
	open?: boolean
}

/**
 * Toggle logic for Listbox / Combobox selection. Selecting writes the new value
 * to the control immediately. The value the *menu* renders as selected stays
 * frozen at a snapshot taken at selection time, until the panel finishes its
 * exit animation. That holds the selected row steady during the ~300ms close.
 * The menu reads the snapshot only while `open` is not `true`.
 *
 * Read `selectionValue` for the menu's selected state and wire `flushPending` to
 * `AnimatePresence`'s `onExitComplete` (or equivalent). Use `toggle` directly for
 * cases that stay open (e.g. multi-select), where the selection updates live.
 *
 * @returns `{ toggle, commit, flushPending, selectionValue }`. `toggle(v)`
 * applies the live add/remove/clear; `commit(v)` toggles and freezes the
 * rendered selection for the close animation. `flushPending` releases the
 * freeze (wire to exit-complete); `selectionValue` is the frozen-or-live value
 * the menu paints as selected. `toggle` and `commit` keep their identity when
 * the value changes.
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
					return toggleListItem(Array.isArray(prev) ? (prev as T[]) : [], newValue)
				}

				if (nullable && prev === newValue) return undefined

				return newValue
			})
		},
		[multiple, nullable, setValue],
	)

	// Snapshot of the value the menu paints as selected while the panel animates
	// closed; released on exit-complete or reopen.
	const { snapshot, freeze, flush: flushPending } = useFrozenOnClose<T | T[] | undefined>(open)

	// A stable event, so that `commit` keeps one identity when the value changes.
	// With `value` in its deps, `commit` took a new identity on each selection,
	// and so did the `select` of each host. Each memoized option then rendered
	// again.
	const commit = useStableEvent((newValue: T) => {
		freeze(value)

		toggle(newValue)
	})

	const selectionValue = snapshot ? snapshot.value : value

	return { toggle, commit, flushPending, selectionValue }
}
