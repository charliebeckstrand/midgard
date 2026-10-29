/**
 * The cost of one keystroke in a QueryBuilder: an edit to the value of one rule.
 *
 * Each scenario mounts one group of rules, controlled, and each sample gives it
 * the tree that `updateRule` makes for a new value of the first rule: a new root
 * and a new rule, with each other rule kept. The sample commits through
 * `flushSync`, then reads the rect of the host so the browser lays out the
 * builder. Paint is outside the sample.
 *
 * The `plain` rows render the children in place. The `reorder` rows render them
 * through Motion's `Reorder`. An edit renders the group of the edited rule, so
 * the work that grows with the size of the group is the work that each child
 * does again when the group renders.
 */

import { QueryBuilder, type QueryField, type QueryGroup, type QueryRule } from '../../modules/query'
import { compareBenches } from '../compare'
import { benches, type Prepared, reactHost, WINDOW } from './harness'

const FIELDS: QueryField[] = [{ name: 'age', label: 'Age', type: 'number' }]

const noop = () => {}

/** One group of `count` number rules. */
function tree(count: number): QueryGroup {
	return {
		id: 'root',
		type: 'group',
		combinator: 'and',
		children: Array.from(
			{ length: count },
			(_, index): QueryRule => ({
				id: `r${index}`,
				type: 'rule',
				field: 'age',
				operator: 'equals',
				value: index,
			}),
		),
	}
}

/** The tree with a new value for the first rule, as `updateRule` copies the path. */
function edited(base: QueryGroup, value: number): QueryGroup {
	const [first, ...rest] = base.children as QueryRule[]

	return { ...base, children: [{ ...(first as QueryRule), value }, ...rest] }
}

/** One scenario: the builder mounts in its first sample, and each sample is one edit. */
function scenario(count: number, reorder: boolean): Prepared {
	const base = tree(count)

	let mounted: ReturnType<typeof reactHost> | null = null

	let value = 0

	const render = (next: QueryGroup) =>
		mounted?.render(
			<QueryBuilder fields={FIELDS} value={next} onValueChange={noop} reorder={reorder} />,
		)

	return {
		name: reorder ? 'reorder' : 'plain',
		run: () => {
			if (!mounted) {
				mounted = reactHost()

				render(base)
			}

			value = value === 1000 ? 1001 : 1000

			render(edited(base, value))

			document.body.getBoundingClientRect()
		},
	}
}

for (const count of [32, 128]) {
	compareBenches(
		`query · edit one rule of ${count}`,
		(bench) => {
			benches(bench, [scenario(count, false), scenario(count, true)])
		},
		WINDOW.slow,
	)
}
