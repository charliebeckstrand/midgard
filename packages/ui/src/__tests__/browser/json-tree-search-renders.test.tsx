import { describe, expect, it } from 'vitest'
import { JsonTree, type JsonTreeSearch } from '../../components/json-tree'
import { renderUI } from '../helpers'
import { componentRenders } from './helpers/motion-renders'

const LEAVES = 50

/** One branch of 50 leaves. Only the value of `item7` is `zeta`, and the others are `alpha`. */
const data = Object.fromEntries(
	Array.from({ length: LEAVES }, (_, index) => [`item${index}`, index === 7 ? 'zeta' : 'alpha']),
)

/**
 * A new search term renders only the parts whose search state changes: the
 * entry list of the root, and the row of the one leaf whose match changes.
 * Each other row keeps its state, so it does not render. When the term was in
 * the context value, each node read it, and each node rendered on each
 * keystroke.
 */
describe('JsonTree search renders', () => {
	it.each<{ name: string; search: JsonTreeSearch; next: JsonTreeSearch; rows: number }>([
		// The term starts to match `item7` alone.
		{ name: 'highlight', search: '', next: 'zeta', rows: LEAVES + 1 },
		// Each leaf matches `a`, and `item7` stops matching at `al`, so the filter
		// hides it.
		{
			name: 'filter',
			search: { value: 'a', filter: true },
			next: { value: 'al', filter: true },
			rows: LEAVES,
		},
	])('renders only the changed nodes for a new term ($name)', ({ search, next, rows }) => {
		const { container, rerender } = renderUI(<JsonTree data={data} search={search} />)

		rerender(<JsonTree data={data} search={next} />)

		expect(container.querySelectorAll('[role="treeitem"]')).toHaveLength(rows)

		// The last commit is the one that renders the entries for the new term.
		const renders = ['JsonTreeNodeView', 'JsonTreeEntries', 'JsonTreeLeafRow'].reduce(
			(sum, name) => sum + componentRenders(container, name),
			0,
		)

		// The entry list of the root renders, so the walk is live.
		expect(renders).toBeGreaterThan(0)

		// It renders with the row of `item7` at most, and the other rows do not.
		expect(renders).toBeLessThanOrEqual(2)
	})
})
