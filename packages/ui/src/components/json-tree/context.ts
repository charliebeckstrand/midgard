'use client'

import { createContext } from '../../core/create-context'
import type { SearchIndex } from './utilities'

type JsonTreeContext = {
	depth: number
	defaultExpandDepth: number
	search: string
	filter: boolean
	searchIndex: SearchIndex
	path: string
	expanded?: Set<string>
	onExpandedChange?: (expanded: Set<string>) => void
}

export const [JsonTreeProvider, useJsonTreeContext] = createContext<JsonTreeContext>('JsonTree')
