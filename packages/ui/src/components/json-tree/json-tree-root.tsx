'use client'

import { memo } from 'react'
import { useJsonTreeContext } from './context'
import { JsonTreeNode } from './json-tree-node'
import type { JsonValue } from './types'
import { useRootSearch } from './use-json-tree-search'

/** Props for {@link JsonTreeRoot}. @internal */
type JsonTreeRootProps = {
	keyName?: string | number
	value: JsonValue
}

/**
 * The root node of a {@link JsonTree}. The root has no parent to give it its
 * search state, so it reads the state from the search store, as the entry
 * lists do. Then each part of the tree reads the same published term.
 *
 * @internal
 */
export const JsonTreeRoot = memo(function JsonTreeRoot({ keyName, value }: JsonTreeRootProps) {
	const { search, searchIndex } = useJsonTreeContext()

	const searchState = useRootSearch(search, searchIndex, keyName, value)

	return <JsonTreeNode keyName={keyName} value={value} searchState={searchState} />
})
