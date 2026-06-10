'use client'

import { createContext } from '../../core'
import type { TreeSize } from '../../recipes/kata/tree'

type TreeContextValue = {
	depth: number
	size: TreeSize
	indent: boolean
}

export const [TreeContext, useTreeContext] = createContext<TreeContextValue>('Tree')

type TreePositionValue = {
	/** 1-based position among rendered siblings. */
	posinset?: number
	/** Number of rendered siblings at this level. */
	setsize?: number
}

/**
 * Per-item sibling position, stamped by `Tree` / `TreeItemChildren`; each
 * treeitem emits it as `aria-setsize`/`aria-posinset`. With collapsible
 * branches the DOM child count diverges from the logical set.
 */
export const [TreePositionContext, useTreePosition] = createContext<TreePositionValue>(
	'TreePosition',
	{ default: {} },
)
