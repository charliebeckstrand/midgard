/**
 * Tree is recursive, so its cost grows with total node count and depth: each
 * `TreeItem` computes a fresh `childContextValue` memo and renders a button
 * with depth-based padding. The collapsed rung is the same node count with
 * only the top level rendered: what a closed branch actually saves.
 */

import type { ReactNode } from 'react'
import { Tree, TreeItem } from '../components/tree'
import { compareBenches } from './compare'
import { mountBench, mountBenches } from './harness'

/** A balanced tree of `branching^depth` items, every branch open or every branch closed. */
function makeTreeNodes(depth: number, branching: number, open: boolean): ReactNode {
	if (depth === 0) return null

	const nodes: ReactNode[] = []

	for (let index = 0; index < branching; index++) {
		nodes.push(
			<TreeItem key={`d${depth}-i${index}`} label={`Node ${depth}.${index}`} defaultOpen={open}>
				{makeTreeNodes(depth - 1, branching, open)}
			</TreeItem>,
		)
	}

	return <>{nodes}</>
}

// Built at collection time: `makeTreeNodes` allocates one element per node, so
// leaving it in the timed factory would charge the mount for constructing the
// tree it renders. That distortion is worst exactly where the measurement
// matters most: the collapsed rung renders only the top level, so the build
// was four fifths of its number.
const OPEN = [
	{ depth: 3, nodes: '100', tree: makeTreeNodes(3, 5, true) },
	{ depth: 4, nodes: '~1k', tree: makeTreeNodes(4, 5, true) },
	{ depth: 5, nodes: '~5k', tree: makeTreeNodes(5, 5, true) },
]

const collapsed = makeTreeNodes(5, 5, false)

compareBenches('Tree · render (all open)', (bench) => {
	mountBenches(
		bench,
		OPEN,
		({ depth, nodes }) => `${nodes} nodes (d${depth}×b5, open)`,
		({ tree }) => <Tree aria-label="Files">{tree}</Tree>,
	)
})

compareBenches('Tree · render (all collapsed)', (bench) => {
	mountBench(bench, '~5k nodes (d5×b5, collapsed) — only top level rendered', () => (
		<Tree aria-label="Files">{collapsed}</Tree>
	))
})
