'use client'

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
}

export const [JsonTreeContext, useJsonTreeContext] = createContext<JsonTreeContextValue>('JsonTree')
