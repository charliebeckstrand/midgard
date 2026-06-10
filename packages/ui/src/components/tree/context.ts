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
 * Per-item sibling position, stamped by `Tree` / `TreeItemChildren` so each
 * treeitem can emit `aria-setsize`/`aria-posinset` — with collapsible
 * branches the DOM child count diverges from the logical set, so "item 2 of
 * 5" is otherwise unannounceable.
 */
export const [TreePositionContext, useTreePosition] = createContext<TreePositionValue>(
	'TreePosition',
	{ default: {} },
)
