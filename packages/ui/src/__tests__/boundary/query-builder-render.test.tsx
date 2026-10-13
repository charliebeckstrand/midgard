import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Segment } from '../../components/segment'
import { QueryBuilder, type QueryField, type QueryGroup, type QueryRule } from '../../modules/query'
import { renderUI } from '../helpers'

/**
 * An edit renders only the AND/OR separators that it changes.
 *
 * An edit renders the group of the edited node. The group built the segment of
 * each separator in its own render, so each segment of the group rendered
 * again on each keystroke. Each separator is now a memoized component.
 *
 * The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../components/segment', async (importActual) => {
	const actual = await importActual<typeof import('../../components/segment')>()

	return { ...actual, Segment: vi.fn(actual.Segment) }
})

const FIELDS: QueryField[] = [{ name: 'age', label: 'Age', type: 'number' }]

const COUNT = 12

const noop = () => {}

function tree(): QueryGroup {
	return {
		id: 'root',
		type: 'group',
		combinator: 'and',
		children: Array.from(
			{ length: COUNT },
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

/** The tree with one rule replaced, as `updateRule` copies the path. */
function withRule(base: QueryGroup, index: number, patch: Partial<QueryRule>): QueryGroup {
	return {
		...base,
		children: base.children.map((child, at) =>
			at === index ? ({ ...child, ...patch } as QueryRule) : child,
		),
	}
}

describe('query builder separator renders', () => {
	beforeEach(() => {
		vi.mocked(Segment).mockClear()
	})

	it.each([false, true])('renders no separator for a value edit (reorder: %s)', (reorder) => {
		const base = tree()

		const { rerender } = renderUI(
			<QueryBuilder fields={FIELDS} value={base} onValueChange={noop} reorder={reorder} />,
		)

		expect(vi.mocked(Segment)).toHaveBeenCalledTimes(COUNT - 1)

		vi.mocked(Segment).mockClear()

		rerender(
			<QueryBuilder
				fields={FIELDS}
				value={withRule(base, 5, { value: 99 })}
				onValueChange={noop}
				reorder={reorder}
			/>,
		)

		expect(vi.mocked(Segment)).not.toHaveBeenCalled()
	})

	it('renders only the separator whose combinator changes', () => {
		const base = tree()

		const { rerender } = renderUI(
			<QueryBuilder fields={FIELDS} value={base} onValueChange={noop} />,
		)

		vi.mocked(Segment).mockClear()

		rerender(
			<QueryBuilder
				fields={FIELDS}
				value={withRule(base, 5, { combinator: 'or' })}
				onValueChange={noop}
			/>,
		)

		expect(vi.mocked(Segment)).toHaveBeenCalledTimes(1)

		expect(vi.mocked(Segment).mock.calls[0]?.[0]).toMatchObject({ value: 'or' })
	})
})
