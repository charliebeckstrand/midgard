/**
 * Tree is recursive, so its cost grows with total node count and depth: each
 * `TreeItem` computes a fresh `childContextValue` memo and renders a button
 * with depth-based padding. The collapsed rung is the same node count with
 * only the top level rendered — what a closed branch actually saves.
 */

import type { ReactNode } from 'react'
import { describe } from 'vitest'
import { Tree, TreeItem } from '../components/tree'
import { mountBench, mountBenches } from './harness'

/** A balanced tree of `branching^depth` items, every branch open or every branch closed. */
function buildTreeNodes(depth: number, branching: number, open: boolean): ReactNode {
	if (depth === 0) return null

	const nodes: ReactNode[] = []

	for (let index = 0; index < branching; index++) {
		nodes.push(
			<TreeItem key={`d${depth}-i${index}`} label={`Node ${depth}.${index}`} defaultOpen={open}>
				{buildTreeNodes(depth - 1, branching, open)}
			</TreeItem>,
		)
	}

	return <>{nodes}</>
}

describe('Tree · render (all open)', () => {
	mountBenches(
		[
			{ depth: 3, nodes: '100' },
			{ depth: 4, nodes: '~1k' },
			{ depth: 5, nodes: '~5k' },
		],
		({ depth, nodes }) => `${nodes} nodes (d${depth}×b5, open)`,
		({ depth }) => <Tree aria-label="Files">{buildTreeNodes(depth, 5, true)}</Tree>,
	)
})

describe('Tree · render (all collapsed)', () => {
	mountBench('~5k nodes (d5×b5, collapsed) — only top level rendered', () => (
		<Tree aria-label="Files">{buildTreeNodes(5, 5, false)}</Tree>
	))
})
