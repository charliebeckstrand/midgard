'use client'

import { useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createEmitter } from '../../utilities/emitter'
import {
	type JsonTreeSearchState,
	readEntriesSearch,
	type SearchIndex,
} from './json-tree-utilities'
import type { JsonValue } from './types'

/**
 * Holds the search of a {@link JsonTree}. The entry list of each branch reads
 * the states of its entries from it, so the search stays out of the context
 * value.
 *
 * @internal
 */
export type JsonTreeSearchStore = {
	/** The current search. */
	get: () => JsonTreeSearchState
	/** Calls `listener` each time the search changes, and returns the unsubscribe. */
	subscribe: (listener: () => void) => () => void
}

/**
 * A {@link JsonTreeSearchStore} that follows the search of the render.
 *
 * @param term - The search term.
 * @param filter - Whether the filter hides the nodes that do not match.
 * @param index - The index of the term, from `buildSearchIndex`.
 * @returns A store that keeps its identity. The hook publishes a new search in
 * a layout effect, so a new term renders only the parts whose search state
 * changes, before the paint.
 * @internal
 */
export function useSearchStore(
	term: string,
	filter: boolean,
	index: SearchIndex,
): JsonTreeSearchStore {
	const [store] = useState(() => {
		let current: JsonTreeSearchState = { term, filter, index }

		const emitter = createEmitter()

		return {
			get: () => current,
			subscribe: emitter.subscribe,
			publish: (next: JsonTreeSearchState) => {
				current = next

				emitter.emit()
			},
		}
	})

	useLayoutEffect(() => {
		const current = store.get()

		if (current.term === term && current.filter === filter && current.index === index) return

		store.publish({ term, filter, index })
	}, [store, term, filter, index])

	return store
}

/**
 * The packed search state of each entry of a branch of a {@link JsonTree}.
 *
 * @param store - The search store of the tree.
 * @param entries - The entries of the branch.
 * @returns The state of each entry, or `undefined` with no term. The caller
 * renders for a new term only when the state of an entry changes.
 * @internal
 */
export function useEntriesSearch(
	store: JsonTreeSearchStore,
	entries: [string | number, JsonValue][],
): number[] | undefined {
	const read = () => readEntriesSearch(store.get(), entries)

	const snapshot = useSyncExternalStore(store.subscribe, read, read)

	return useMemo(() => (snapshot === '' ? undefined : snapshot.split(',').map(Number)), [snapshot])
}
