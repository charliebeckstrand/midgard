'use client'

import type { RefObject } from 'react'
import { createContext } from '../../core'
import type { KeyedStore } from '../../utilities'
import type { SearchIndex } from './json-tree-utilities'

type JsonTreeContextValue = {
	depth: number
	defaultExpandDepth: number
	search: string
	filter: boolean
	searchIndex: SearchIndex
	path: string
	/** Whether the tree runs from a controlled `expanded` set. */
	controlled: boolean
	/**
	 * Whether each path is in the controlled `expanded` set. A node subscribes to
	 * its own path, so a toggle renders only the nodes whose open state changed.
	 * The set itself stays out of the context value, because a new set would
	 * render each node of the tree.
	 */
	expansion: KeyedStore<string, boolean>
	/** Toggles a path in the controlled set. It keeps its identity across renders. */
	toggleExpanded: (path: string) => void
	/**
	 * Uncontrolled toggles, keyed by node path, owned above every node so they
	 * outlive one. Collapsing a branch unmounts its descendants and takes their
	 * local state with it. Without this a reopened branch would forget every
	 * expansion inside it. The controlled path over `expanded` survives that, and
	 * so does the virtualized path over its own set.
	 *
	 * A ref, not state: nodes seed their local state from it on mount and write
	 * through on toggle, so the memory costs no re-render. Holding it in the
	 * context value instead would re-key every nested provider on each toggle and
	 * re-render the whole tree.
	 */
	userOpen: RefObject<Map<string, boolean>>
}

export const [JsonTreeContext, useJsonTreeContext] = createContext<JsonTreeContextValue>('JsonTree')
