'use client'

import type { RefObject } from 'react'
import { createContext } from '../../core'
import type { SearchIndex } from './json-tree-utilities'

type JsonTreeContextValue = {
	depth: number
	defaultExpandDepth: number
	search: string
	filter: boolean
	searchIndex: SearchIndex
	path: string
	expanded?: Set<string>
	onExpandedChange?: (expanded: Set<string>) => void
	/**
	 * Uncontrolled toggles, keyed by node path, owned above every node so they
	 * outlive one. Collapsing a branch unmounts its descendants and takes their
	 * local state with it, so without this a reopened branch would forget every
	 * expansion inside it — which the controlled path over `expanded`, and the
	 * virtualized path over its own set, both survive.
	 *
	 * A ref, not state: nodes seed their local state from it on mount and write
	 * through on toggle, so the memory costs no re-render. Holding it in the
	 * context value instead would re-key every nested provider on each toggle and
	 * re-render the whole tree.
	 */
	userOpen: RefObject<Map<string, boolean>>
}

export const [JsonTreeContext, useJsonTreeContext] = createContext<JsonTreeContextValue>('JsonTree')
