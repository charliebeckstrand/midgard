import { describe, expect, it } from 'vitest'
import {
	createGroup,
	QueryBuilder,
	QueryChips,
	type QueryField,
	type QueryGroup,
	type QueryRule,
} from '../../../modules/query'
import { DensityProvider } from '../../../providers/density'
import { present, renderUI } from '../../helpers'

/**
 * QueryChips and the AND/OR segment of QueryBuilder take the step of the
 * nearest density scope. Each stays one step below the controls around it, as
 * at the default step. Before, each kept one size at each step (V26). At
 * `snug` (`md`) the values are the values from before the change.
 */

type Density = 'compact' | 'snug' | 'loose'

const fields: QueryField[] = [{ name: 'name', label: 'Name', type: 'text' }]

const rule = (id: string, combinator: 'and' | 'or'): QueryRule => ({
	id,
	type: 'rule',
	combinator,
	field: 'name',
	operator: 'contains',
	value: id,
})

const query = (): QueryGroup => createGroup('and', [rule('a', 'and'), rule('b', 'or')])

const px = (value: string) => Number.parseFloat(value)

/**
 * The measured sizes at each step. A combinator is one step below the chips,
 * and the segment is one step below the rules. No step is below `xs`, so at
 * `compact` a combinator keeps its `snug` size.
 */
const EXPECTED = {
	chips: {
		compact: {
			chipHeight: 28,
			chipText: 12,
			removeIcon: 16,
			combinatorHeight: 26,
			combinatorText: 12,
		},
		snug: {
			chipHeight: 32,
			chipText: 14,
			removeIcon: 18,
			combinatorHeight: 26,
			combinatorText: 12,
		},
		loose: {
			chipHeight: 36,
			chipText: 16,
			removeIcon: 20,
			combinatorHeight: 32,
			combinatorText: 14,
		},
	},
	readOnly: {
		compact: {
			chipHeight: 26,
			chipText: 12,
			removeIcon: 0,
			combinatorHeight: 20,
			combinatorText: 12,
		},
		snug: { chipHeight: 28, chipText: 14, removeIcon: 0, combinatorHeight: 20, combinatorText: 12 },
		loose: {
			chipHeight: 30,
			chipText: 16,
			removeIcon: 0,
			combinatorHeight: 22,
			combinatorText: 14,
		},
	},
	segment: {
		compact: { height: 30, text: 10 },
		snug: { height: 36, text: 12 },
		loose: { height: 42, text: 14 },
	},
} as const

function measureChips(density: Density, readOnly = false) {
	const { container } = renderUI(
		<DensityProvider density={density}>
			<QueryChips fields={fields} defaultValue={query()} readOnly={readOnly} />
		</DensityProvider>,
	)

	const chip = present(
		container.querySelector('[data-slot="query-chips"] [data-slot="badge"]'),
		'a chip',
	)

	const combinator = present(
		readOnly
			? [...container.querySelectorAll('[data-slot="query-chips"] > span')].find((span) =>
					/^(and|or)$/i.test(span.textContent ?? ''),
				)
			: container.querySelector('[data-slot="query-chips-combinator"]'),
		'the combinator',
	)

	const remove = chip.querySelector('[data-slot="query-chip-remove"] [data-slot="icon"]')

	const box = chip.getBoundingClientRect()

	return {
		chipHeight: box.height,
		chipText: px(getComputedStyle(chip).fontSize),
		removeIcon: remove?.getBoundingClientRect().width ?? 0,
		combinatorHeight: combinator.getBoundingClientRect().height,
		combinatorText: px(getComputedStyle(combinator).fontSize),
	}
}

function measureSegment(density: Density) {
	const { container } = renderUI(
		<DensityProvider density={density}>
			<QueryBuilder fields={fields} defaultValue={query()} />
		</DensityProvider>,
	)

	const segment = present(container.querySelector('[data-slot="segment"]'), 'the segment')

	const item = present(segment.querySelector('[role="tab"]'), 'a segment item')

	return {
		height: segment.getBoundingClientRect().height,
		text: px(getComputedStyle(item).fontSize),
	}
}

describe('Query density', () => {
	it.each(['compact', 'snug', 'loose'] as const)(
		'sizes the chips and the combinators at the step of a %s provider',
		(density) => {
			expect(measureChips(density)).toEqual(EXPECTED.chips[density])

			expect(measureChips(density, true)).toEqual(EXPECTED.readOnly[density])
		},
	)

	it.each([
		['compact', '2.75'],
		['snug', '3.25'],
		['loose', '3.75'],
	] as const)(
		'caps the hit areas at the space between the chips at a %s provider',
		(density, stop) => {
			const { container } = renderUI(
				<DensityProvider density={density}>
					<QueryChips fields={fields} defaultValue={query()} />
				</DensityProvider>,
			)

			const row = present(container.querySelector('[data-slot="query-chips"]'), 'the row')

			expect(getComputedStyle(row).getPropertyValue('--touch-target-gap-x')).toContain(stop)
		},
	)

	it.each(['compact', 'snug', 'loose'] as const)(
		'sizes the AND/OR segment at the step of a %s provider',
		(density) => {
			expect(measureSegment(density)).toEqual(EXPECTED.segment[density])
		},
	)
})
