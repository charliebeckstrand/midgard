'use client'

import { JsonTreeBranchClose } from './json-tree-branch-close'
import { JsonTreeBranchHeader } from './json-tree-branch-header'
import { JsonTreeLeafRow } from './json-tree-leaf-row'
import type { FlatNode } from './json-tree-utilities'

type JsonNodeRowProps = {
	node: FlatNode
	onToggle: (path: string) => void
}

/**
 * Flat, non-recursive renderer for a single row in the virtualized JsonTree.
 * Shares visual slots (`json-node`, `json-node-toggle`, `json-close`) and
 * classes with the recursive JsonTreeNode so styling, tests, and recipe lookups
 * stay aligned.
 */
export function JsonTreeNodeRow({ node, onToggle }: JsonNodeRowProps) {
	if (node.type === 'leaf') {
		return (
			<JsonTreeLeafRow
				depth={node.depth}
				keyName={node.keyName}
				value={node.value}
				highlighted={node.highlighted}
			/>
		)
	}

	const isArray = Array.isArray(node.value)

	if (node.type === 'branch-close') {
		return <JsonTreeBranchClose depth={node.depth} isArray={isArray} />
	}

	return (
		<div data-slot="json-node" data-highlighted={node.highlighted || undefined}>
			<JsonTreeBranchHeader
				depth={node.depth}
				keyName={node.keyName}
				isArray={isArray}
				open={node.open}
				count={node.count}
				highlighted={node.highlighted}
				onToggle={() => onToggle(node.path)}
			/>
		</div>
	)
}
