'use client'

import { useState } from 'react'
import { createEmitter } from '../../utilities'
import type { HeaderActionsStore } from './context'

/** Creates an empty {@link HeaderActionsStore}. @internal */
function createStore(): HeaderActionsStore {
	let element: HTMLElement | null = null

	const { subscribe, emit } = createEmitter()

	return {
		set: (next) => {
			if (next === element) return

			element = next

			emit()
		},
		get: () => element,
		subscribe,
	}
}

/**
 * Makes the {@link HeaderActionsStore} of a {@link HeaderActions}.
 *
 * @returns A store that keeps its identity for the mount. Pass it into
 * {@link HeaderActionsContext}.
 *
 * @remarks
 * A store, not state: the element arrives after the first commit, and only the
 * widget that reads it renders again.
 *
 * @internal
 */
export function useHeaderActionsStore(): HeaderActionsStore {
	const [store] = useState(createStore)

	return store
}
