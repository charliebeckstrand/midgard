'use client'

import { useLayoutEffect, useState } from 'react'

// A result in the listbox: a rendered option, or a `VirtualOptions` wrapper that
// holds items. The wrapper stamps `data-empty` from the length of its items,
// which is also the `count` of the source it registers. The probe reads the
// stamp and not the source: the source registers in an effect, which can run
// after the observer reports the mutation.
const RESULT_SELECTOR = '[role="option"], [data-slot="virtual-options"]:not([data-empty])'

/**
 * Whether a listbox holds no result, measured again as its subtree changes.
 * A consumer that filters on its own state changes the options with no render
 * of the widget, so a `MutationObserver` watches the list. It also watches
 * `data-empty`, which a `VirtualOptions` wrapper toggles with no change to its
 * rows when its window holds none.
 *
 * @param list - The listbox, or an element that holds it, held as state. It
 * mounts with the portal of its popup, a commit after the open.
 * @param onChange - Runs after each measure that a change of the subtree
 * causes. The command palette seeds the highlight again from it. Keep it
 * stable, because a new function attaches the observer again.
 * @returns `false` while no list is attached.
 * @internal
 */
export function useEmptyResults(list: HTMLElement | null, onChange?: () => void): boolean {
	const [empty, setEmpty] = useState(false)

	// A layout effect, so that the first measure lands before the paint and the
	// no-results text does not flash.
	useLayoutEffect(() => {
		if (!list) return

		// A write of the same value still costs a render of the widget while a
		// deferred render is pending, so the probe writes only a change.
		let prev: boolean | undefined

		const measure = () => {
			const next = list.querySelector(RESULT_SELECTOR) === null

			if (next === prev) return

			prev = next

			setEmpty(next)
		}

		measure()

		const observer = new MutationObserver(() => {
			measure()

			onChange?.()
		})

		observer.observe(list, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-empty'],
		})

		return () => observer.disconnect()
	}, [list, onChange])

	// The state from the last attach stays while no list is attached. The
	// first measure after the next attach writes it before the paint.
	return list !== null && empty
}
