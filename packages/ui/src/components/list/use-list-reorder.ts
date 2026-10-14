'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { createLazyModule } from '../../utilities/lazy-module'
import { noop } from '../../utilities/noop'
import type { ListReorderParts } from './list-reorder'

/** The reorder parts, which load in a chunk of their own. */
const reorderParts = createLazyModule(() =>
	import('./list-reorder').then((module) => module.ListReorder),
)

/**
 * Loads the module of the reorder parts one time. Each later call gets the same
 * promise. If the load fails, the next call tries again.
 *
 * @internal
 */
export function loadListReorder(): Promise<ListReorderParts> {
	return reorderParts.load()
}

// The server has no parts, so a hydration render matches the server markup. React
// then renders again with the parts, if they have arrived.
const getServerSnapshot = () => null

/**
 * The parts of a reorderable {@link List} that Motion's `Reorder` drives, or
 * `undefined` until their module arrives.
 *
 * When `enabled` is `true`, the hook loads the module after the list mounts.
 * Until the module arrives, the list renders a plain `<ul>`, and the keyboard
 * reorder works. A pointer drag starts after the module arrives. When the
 * module arrives, the `<ul>` changes to the `Reorder` group, and React mounts
 * the rows again. When the module has arrived before the list mounts, the list
 * renders the group in its first render, except in a hydration render.
 *
 * The hook starts the load one time for each mount. If that load fails, the
 * hook does not try again. The list stays a plain `<ul>`, the keyboard reorder
 * works, and a pointer drag does not start. A later load that is successful
 * heals the list: for example, when a different reorderable list mounts, or
 * when this list mounts again.
 *
 * @internal
 */
export function useListReorder(enabled: boolean): ListReorderParts | undefined {
	const parts = useSyncExternalStore(reorderParts.subscribe, reorderParts.read, getServerSnapshot)

	useEffect(() => {
		if (enabled) loadListReorder().catch(noop)
	}, [enabled])

	return enabled ? (parts ?? undefined) : undefined
}
