'use client'

import { createContext } from '../../core/create-context'
import type { TreeColor } from '../../recipes/katachi/tree'

type TreeContext = {
	depth: number
	color?: TreeColor
}

export const [TreeProvider, useTreeContext] = createContext<TreeContext>('Tree')
