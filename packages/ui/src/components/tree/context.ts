'use client'

import { createContext } from '../../core/create-context'

type TreeContext = {
	depth: number
}

export const [TreeProvider, useTreeContext] = createContext<TreeContext>('Tree')
