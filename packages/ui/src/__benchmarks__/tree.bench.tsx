import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { bench, describe } from 'vitest'
import { Tree, TreeItem } from '../components/tree'

// Tree is a recursive component; cost grows with total node count and depth.
// Each TreeItem computes a new `childContextValue` memo and renders a button
// with depth-based padding.

function buildTreeNodes(depth: number, branching: number, open: boolean): ReactNode {
	if (depth === 0) return null

	const nodes: ReactNode[] = []

	for (let i = 0; i < branching; i++) {
		nodes.push(
			<TreeItem key={`d${depth}-i${i}`} label={`Node ${depth}.${i}`} defaultOpen={open}>
				{buildTreeNodes(depth - 1, branching, open)}
			</TreeItem>,
		)
	}

	return <>{nodes}</>
}

describe('Tree · render (all open)', () => {
	bench('100 nodes (d3×b5, open)', () => {
		render(<Tree>{buildTreeNodes(3, 5, true)}</Tree>)

		cleanup()
	})

	bench('~1k nodes (d4×b5, open)', () => {
		render(<Tree>{buildTreeNodes(4, 5, true)}</Tree>)

		cleanup()
	})

	bench('~5k nodes (d5×b5, open)', () => {
		render(<Tree>{buildTreeNodes(5, 5, true)}</Tree>)

		cleanup()
	})
})

describe('Tree · render (all collapsed)', () => {
	bench('~5k nodes (d5×b5, collapsed) — only top level rendered', () => {
		render(<Tree>{buildTreeNodes(5, 5, false)}</Tree>)

		cleanup()
	})
})
