'use client'

import { createContext } from '../../core/create-context'
import type { TreeSize } from '../../recipes/kata/tree'

type TreeContext = {
	depth: number
	size: TreeSize
	indent: boolean
}

export const [TreeProvider, useTreeContext] = createContext<TreeContext>('Tree')
