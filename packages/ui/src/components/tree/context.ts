'use client'

import { createContext } from '../../core'
import type { TreeSize } from '../../recipes/kata/tree'

type TreeContextValue = {
	depth: number
	size: TreeSize
	indent: boolean
}

export const [TreeContext, useTreeContext] = createContext<TreeContextValue>('Tree')
