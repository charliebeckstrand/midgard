import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { JsonTree } from '../components/json-tree'
import { makeJsonTree } from './fixtures'

// JsonTree's render cost is dominated by JsonNode recursion + filterEntries.
// Pair with json-tree.bench.ts (pure logic) to isolate algorithmic cost.

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
