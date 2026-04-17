'use client'

import { createContext } from '../../core/create-context'

type JsonTreeContext = {
	depth: number
	defaultExpandDepth: number
	copyPath: boolean
	onCopyPath?: (path: (string | number)[]) => void
}

export const [JsonTreeProvider, useJsonTreeContext] = createContext<JsonTreeContext>('JsonTree')
