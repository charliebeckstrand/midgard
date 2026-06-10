import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { bench, describe } from 'vitest'
import { JsonTree } from '../components/json-tree'
import { collectPaths } from '../components/json-tree/json-tree-utilities'
import { makeJsonTree } from './fixtures'

// JsonNode recursion + filterEntries dominate JsonTree's render cost;
// json-tree.bench.ts isolates the pure logic.

const small = makeJsonTree(3, 5)
const medium = makeJsonTree(4, 5)
const large = makeJsonTree(5, 5)

describe('JsonTree · render', () => {
	bench('small (d3×b5) · depth=1', () => {
		render(<JsonTree data={small} defaultExpandDepth={1} />)

		cleanup()
	})

	bench('small (d3×b5) · fully expanded', () => {
		render(<JsonTree data={small} defaultExpandDepth={Number.POSITIVE_INFINITY} />)

		cleanup()
	})

	bench('medium (d4×b5) · depth=1', () => {
		render(<JsonTree data={medium} defaultExpandDepth={1} />)

		cleanup()
	})

	bench('medium (d4×b5) · fully expanded', () => {
		render(<JsonTree data={medium} defaultExpandDepth={Number.POSITIVE_INFINITY} />)

		cleanup()
	})

	bench('large (d5×b5) · depth=2', () => {
		render(<JsonTree data={large} defaultExpandDepth={2} />)

		cleanup()
	})
})

describe('JsonTree · render with active search', () => {
	bench('medium · search hits (filter=false)', () => {
		render(<JsonTree data={medium} defaultExpandDepth={2} search="value-root" />)

		cleanup()
	})

	bench('medium · search hits (filter=true)', () => {
		render(
			<JsonTree
				data={medium}
				defaultExpandDepth={2}
				search={{ value: 'value-root', filter: true }}
			/>,
		)

		cleanup()
	})

	bench('medium · search miss', () => {
		render(<JsonTree data={medium} defaultExpandDepth={2} search="__absent__" />)

		cleanup()
	})
})

describe('JsonTree · virtualized render', () => {
	bench('medium (d4×b5) · depth=Infinity · virtualize', () => {
		render(
			<JsonTree
				data={medium}
				defaultExpandDepth={Number.POSITIVE_INFINITY}
				virtualize
				maxHeight="600px"
			/>,
		)

		cleanup()
	})

	bench('large (d5×b5) · depth=Infinity · virtualize', () => {
		render(
			<JsonTree
				data={large}
				defaultExpandDepth={Number.POSITIVE_INFINITY}
				virtualize
				maxHeight="600px"
			/>,
		)

		cleanup()
	})
})

// Re-render cost when a single branch toggles. Controlled `expanded` flips
// one branch per iteration and measures only the re-render (not the mount).
const togglePaths = [...collectPaths(medium, undefined, Number.POSITIVE_INFINITY)]

const branchToToggle = togglePaths[Math.floor(togglePaths.length / 2)] ?? togglePaths[0] ?? ''

const allExpanded = new Set(togglePaths)

const oneCollapsed = new Set(togglePaths)

oneCollapsed.delete(branchToToggle)

const noop = () => {}

describe('JsonTree · virtualized · re-render on toggle', () => {
	let rerender: (ui: ReactElement) => void

	let expanded = false

	bench(
		'medium (d4×b5) · toggle one branch',
		() => {
			expanded = !expanded

			rerender(
				<JsonTree
					data={medium}
					expanded={expanded ? allExpanded : oneCollapsed}
					onExpandedChange={noop}
					virtualize
					maxHeight="2000px"
				/>,
			)
		},
		{
			setup() {
				const api = render(
					<JsonTree
						data={medium}
						expanded={oneCollapsed}
						onExpandedChange={noop}
						virtualize
						maxHeight="2000px"
					/>,
				)

				rerender = api.rerender
			},
			teardown() {
				cleanup()
			},
		},
	)
})
