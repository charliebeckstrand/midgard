import { describe, expect, it } from 'vitest'
import { corpus, rows } from '../a11y/cases'
import { allBySlot, bySlot, renderUI } from '../helpers'

/**
 * Skeleton sweep: a skeleton-aware component publishes a silhouette that draws
 * placeholders and renders none of the real component
 * ([CONVENTIONS.md](../../../../../CONVENTIONS.md) §3.7, §10.5). Derived from
 * the shared corpus, so a new skeleton writes a `skeleton` column rather than a
 * copy of this test.
 *
 * A silhouette whose count is part of its contract states it; the rest only
 * claim to draw something, which is the assertion their hand-written copies
 * carried.
 */
const subjects = corpus.flatMap((entry) =>
	(entry.skeleton ?? []).map((subject) => ({ ...subject, name: subject.absentSlot })),
)

describe('component skeletons', () => {
	it.each(rows(subjects))('%s pairs with an explicit skeleton in loading trees', (_name, {
		element,
		absentSlot,
		placeholders,
	}) => {
		const { container } = renderUI(element)

		expect(bySlot(container, absentSlot)).not.toBeInTheDocument()

		const drawn = allBySlot(container, 'placeholder')

		if (placeholders === undefined) expect(drawn.length).toBeGreaterThan(0)
		else expect(drawn).toHaveLength(placeholders)
	})

	// The corpus is the sweep's only input, so an empty one would pass silently.
	it('sweeps every skeleton the corpus declares', () => {
		expect(subjects.length).toBeGreaterThan(20)
	})
})

// Teeth check: a silhouette that renders the real component, or draws nothing,
// must fail the assertions above.
describe('component skeletons: teeth check', () => {
	it('detects a silhouette that leaks the real component', () => {
		const { container } = renderUI(<div data-slot="leaked" />)

		expect(bySlot(container, 'leaked')).toBeInTheDocument()
	})

	it('detects a silhouette that draws no placeholder', () => {
		const { container } = renderUI(<div data-slot="bare" />)

		expect(allBySlot(container, 'placeholder')).toHaveLength(0)
	})
})
