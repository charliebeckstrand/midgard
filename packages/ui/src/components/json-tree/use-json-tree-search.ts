'use client'

import { useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createEmitter } from '../../utilities/emitter'
import {
	buildSearchIndexReader,
	packNodeSearch,
	readEntriesSearch,
	type SearchIndex,
} from './json-tree-utilities'
import type { JsonValue } from './types'

/** The search term and the filter flag of a {@link JsonTree}. @internal */
type SearchTerm = { term: string; filter: boolean }

/**
 * Holds the search term and the filter flag of a {@link JsonTree}. The entry
 * list of each branch reads the states of its entries through it, so the term
 * stays out of the context value.
 *
 * @internal
 */
export type JsonTreeSearchStore = {
	/** The current term and filter flag. */
	get: () => SearchTerm
	/** Calls `listener` each time the term or the filter flag changes, and returns the unsubscribe. */
	subscribe: (listener: () => void) => () => void
}

/**
 * Gives the search index of a term over the `data` of the render. A new `data`
 * value gives a new function, so a reader never takes a match from the index
 * of an old value.
 *
 * @internal
 */
export type JsonTreeSearchIndex = (term: string) => SearchIndex

/**
 * A {@link JsonTreeSearchStore} that follows the term and the filter flag of
 * the render.
 *
 * @param term - The search term.
 * @param filter - Whether the filter hides the nodes that do not match.
 * @returns A store that keeps its identity. The hook publishes a new term in a
 * layout effect, so a new term renders only the parts whose search state
 * changes, before the paint.
 * @internal
 */
export function useSearchStore(term: string, filter: boolean): JsonTreeSearchStore {
	const [store] = useState(() => {
		let current: SearchTerm = { term, filter }

		const emitter = createEmitter()

		return {
			get: () => current,
			subscribe: emitter.subscribe,
			publish: (next: SearchTerm) => {
				current = next

				emitter.emit()
			},
		}
	})

	useLayoutEffect(() => {
		const current = store.get()

		if (current.term === term && current.filter === filter) return

		store.publish({ term, filter })
	}, [store, term, filter])

	return store
}

/**
 * The {@link JsonTreeSearchIndex} of `data`.
 *
 * @param data - The value of the tree.
 * @returns A function that keeps its identity until `data` changes. See
 * `buildSearchIndexReader`.
 * @internal
 */
export function useSearchIndex(data: JsonValue): JsonTreeSearchIndex {
	return useMemo(() => buildSearchIndexReader(data), [data])
}

/**
 * The packed search state of the root of a {@link JsonTree}. The root has no
 * parent to give it its state, so it reads the store as the entry lists do.
 *
 * @param store - The search store of the tree.
 * @param indexFor - The search index of the tree.
 * @param keyName - The key of the root.
 * @param value - The value of the root.
 * @returns The state. The caller renders for a new term only when it changes.
 * @internal
 */
export function useRootSearch(
	store: JsonTreeSearchStore,
	indexFor: JsonTreeSearchIndex,
	keyName: string | number | undefined,
	value: JsonValue,
): number {
	const read = () => {
		const { term, filter } = store.get()

		return packNodeSearch({ term, filter, index: indexFor(term) }, keyName, value, true)
	}

	return useSyncExternalStore(store.subscribe, read, read)
}

/**
 * The packed search state of each entry of a branch of a {@link JsonTree}.
 *
 * @param store - The search store of the tree.
 * @param indexFor - The search index of the tree.
 * @param entries - The entries of the branch.
 * @returns The state of each entry, or `undefined` with no term. The caller
 * renders for a new term only when the state of an entry changes.
 * @internal
 */
export function useEntriesSearch(
	store: JsonTreeSearchStore,
	indexFor: JsonTreeSearchIndex,
	entries: [string | number, JsonValue][],
): number[] | undefined {
	const read = () => {
		const { term, filter } = store.get()

		return readEntriesSearch({ term, filter, index: indexFor(term) }, entries)
	}

	const snapshot = useSyncExternalStore(store.subscribe, read, read)

	return useMemo(() => (snapshot === '' ? undefined : snapshot.split(',').map(Number)), [snapshot])
}
