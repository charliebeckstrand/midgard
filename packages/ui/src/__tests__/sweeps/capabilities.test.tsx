import { describe, expect, it } from 'vitest'
import { corpus } from '../a11y/cases'
import { allBySlot, bySlot, getSlot, renderUI } from '../helpers'

/**
 * Capability sweeps, derived from the shared corpus: a guarantee that holds for
 * every component of a kind is asserted once here, and a new component writes a
 * column rather than a copy of the test
 * ([CONVENTIONS.md](../../../../../CONVENTIONS.md) §10.5).
 *
 * The three sweeps share one file because they share one input. The corpus
 * reaches most of the component tree, so each file that imports it makes
 * another worker build that graph.
 *
 * Each sweep owns the value it passes — the id it spreads, the href it sets —
 * so an entry cannot assert something it did not render.
 */
const PASS_THROUGH_ID = 'pass-through-subject'

const LINK_HREF = '/swept-link'

const passThrough = corpus.flatMap((entry) => entry.passthrough ?? [])

const skeletons = corpus.flatMap((entry) => entry.skeleton ?? [])

const links = corpus.flatMap((entry) => entry.link ?? [])

describe('component pass-through', () => {
	for (const { render, slot } of passThrough) {
		it(`${slot} passes through HTML attributes`, () => {
			const { container } = renderUI(render({ id: PASS_THROUGH_ID }))

			expect(getSlot(container, slot)).toHaveAttribute('id', PASS_THROUGH_ID)
		})
	}

	// A corpus that declared nothing would sweep nothing, and say so by passing.
	it('has subjects to sweep', () => {
		expect(passThrough).not.toHaveLength(0)
	})
})

describe('component skeletons', () => {
	for (const { element, absentSlot, placeholders } of skeletons) {
		it(`${absentSlot} pairs with an explicit skeleton in loading trees`, () => {
			const { container } = renderUI(element)

			expect(bySlot(container, absentSlot)).not.toBeInTheDocument()

			const drawn = allBySlot(container, 'placeholder')

			expect(drawn.length).toBeGreaterThan(0)

			// A silhouette whose count is part of its contract states it; the rest
			// claim only that they draw something.
			if (placeholders !== undefined) expect(drawn).toHaveLength(placeholders)
		})
	}

	it('has subjects to sweep', () => {
		expect(skeletons).not.toHaveLength(0)
	})
})

describe('component links', () => {
	for (const { render, slot } of links) {
		it(`${slot} renders as a link when href is provided`, () => {
			// `baseElement` is the document body, which holds the render container
			// and anything portalled out of it alike.
			const { baseElement } = renderUI(render(LINK_HREF))

			const anchor = getSlot(baseElement, slot)

			expect(anchor.tagName).toBe('A')

			expect(anchor).toHaveAttribute('href', LINK_HREF)
		})
	}

	it('has subjects to sweep', () => {
		expect(links).not.toHaveLength(0)
	})
})

/**
 * Teeth checks: each sweep's assertion must be able to fail, or a corpus that
 * quietly stopped declaring subjects would read as green.
 */
describe('capability sweeps: teeth checks', () => {
	function Dropping(_props: { id: string }) {
		return <div data-slot="dropping" />
	}

	it('detects a component that drops the props it is given', () => {
		const { container } = renderUI(<Dropping id={PASS_THROUGH_ID} />)

		expect(bySlot(container, 'dropping')).not.toHaveAttribute('id', PASS_THROUGH_ID)
	})

	it('detects a silhouette that leaks the real component, or draws nothing', () => {
		const { container } = renderUI(<div data-slot="leaked" />)

		expect(bySlot(container, 'leaked')).toBeInTheDocument()

		expect(allBySlot(container, 'placeholder')).toHaveLength(0)
	})

	it('detects a subject that does not become an anchor', () => {
		const { container } = renderUI(<div data-slot="not-a-link" />)

		expect(bySlot(container, 'not-a-link')?.tagName).not.toBe('A')
	})
})
