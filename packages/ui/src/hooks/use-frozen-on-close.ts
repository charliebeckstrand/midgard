'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Snapshot machinery for a value a closing panel keeps painting while it
 * animates out. `freeze(value)` takes the snapshot as the close begins;
 * `snapshot` holds it — boxed, so `undefined` freezes cleanly — until `flush`
 * releases it (wire to `AnimatePresence`'s `onExitComplete` or equivalent).
 * A reopen drops the snapshot instead: an interrupted exit (reopen mid-close)
 * skips `onExitComplete`, so `flush` never runs and a later close must not
 * repaint the stale snapshot. The guard runs during render, so the reopened
 * panel never paints a stale frame.
 *
 * Shared by `useDeferredToggle` (the selection the menu paints) and
 * `useComboboxState` (the query the menu filters on); both freezes ride the
 * same close animation.
 *
 * @returns `{ snapshot, freeze, flush }`; `freeze` and `flush` are stable.
 * @internal
 */
export function useFrozenOnClose<T>(open: boolean | undefined) {
	const [frozen, setFrozen] = useState<{ value: T } | null>(null)

	const prevOpenRef = useRef(open)

	if (open !== prevOpenRef.current) {
		prevOpenRef.current = open

		if (open && frozen) setFrozen(null)
	}

	const freeze = useCallback((value: T) => setFrozen({ value }), [])

	const flush = useCallback(() => setFrozen(null), [])

	return { snapshot: frozen, freeze, flush }
}
