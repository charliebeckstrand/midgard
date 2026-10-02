'use client'

import { dataAttr } from '../../core'
import { JsonTreeBranchClose } from './json-tree-branch-close'
import { JsonTreeBranchHeader } from './json-tree-branch-header'
import { INDENT_REM } from './json-tree-constants'
import { JsonTreeLeafRow } from './json-tree-leaf-row'
import type { FlatNode } from './json-tree-utilities'

type JsonNodeRowProps = {
	node: FlatNode
	/** The row's position in the flat node list. The tree reads it to move focus to a row outside the window. */
	index: number
	onToggle: (path: string) => void
	/** Carries the tree's single Tab stop. Windowing decides per render which mounted row holds it. */
	tabbable?: boolean
}

/**
 * Flat, non-recursive renderer for a single row in the virtualized JsonTree.
 * Shares visual slots (`json-node`, `json-node-toggle`, `json-close`) and
 * classes with the recursive {@link JsonTreeNode}. The row root carries
 * `data-index`, so the keyboard handler can map a focused row to its flat index.
 * The flat list has no nested group to pad, so the row root pads its start by
 * the depth. The padding is the `indent` of a nested group once per depth.
 * Windowing keeps most siblings out of the DOM, so each treeitem states its
 * `aria-setsize` and `aria-posinset`.
 *
 * @internal
 */
export function JsonTreeNodeRow({ node, index, onToggle, tabbable }: JsonNodeRowProps) {
	return (
		<div data-index={index} style={{ paddingInlineStart: `${node.depth * INDENT_REM}rem` }}>
			<JsonTreeNodeRowContent node={node} onToggle={onToggle} tabbable={tabbable} />
		</div>
	)
}

function JsonTreeNodeRowContent({ node, onToggle, tabbable }: Omit<JsonNodeRowProps, 'index'>) {
	if (node.type === 'leaf') {
		return (
			<JsonTreeLeafRow
				depth={node.depth}
				keyName={node.keyName}
				value={node.value}
				highlighted={node.highlighted}
				tabbable={tabbable}
				setSize={node.setSize}
				posInSet={node.posInSet}
			/>
		)
	}

	const isArray = Array.isArray(node.value)

	if (node.type === 'branch-close') {
		return <JsonTreeBranchClose isArray={isArray} />
	}

	return (
		<div data-slot="json-node" data-highlighted={dataAttr(node.highlighted)}>
			<JsonTreeBranchHeader
				depth={node.depth}
				keyName={node.keyName}
				isArray={isArray}
				open={node.open}
				count={node.count}
				highlighted={node.highlighted}
				tabbable={tabbable}
				setSize={node.setSize}
				posInSet={node.posInSet}
				onToggle={() => onToggle(node.path)}
			/>
		</div>
	)
}
