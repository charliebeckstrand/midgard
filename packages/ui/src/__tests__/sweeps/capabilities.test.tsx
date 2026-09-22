import { describe, expect, it } from 'vitest'
import { corpus } from '../a11y/cases'
import type { LinkSubject, PassthroughSubject, SkeletonSubject } from '../a11y/cases/types'
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

/** The pass-through sweep: the id it spreads reaches the subject's slot. */
function passesThrough({ render, slot }: PassthroughSubject) {
	const { container } = renderUI(render({ id: PASS_THROUGH_ID }))

	expect(getSlot(container, slot)).toHaveAttribute('id', PASS_THROUGH_ID)
}

/** The skeleton sweep: the silhouette draws placeholders, and never the real component. */
function drawsSkeleton({ element, absentSlot, placeholders }: SkeletonSubject) {
	const { container } = renderUI(element)

	expect(bySlot(container, absentSlot)).not.toBeInTheDocument()

	const drawn = allBySlot(container, 'placeholder')

	expect(drawn.length).toBeGreaterThan(0)

	// A silhouette whose count is part of its contract states it; the rest claim
	// only that they draw something.
	if (placeholders !== undefined) expect(drawn).toHaveLength(placeholders)
}

/** The link sweep: the subject's slot becomes an anchor to the href it sets. */
function becomesLink({ render, slot }: LinkSubject) {
	// `baseElement` is the document body, which holds the render container and
	// anything portalled out of it alike.
	const { baseElement } = renderUI(render(LINK_HREF))

	const anchor = getSlot(baseElement, slot)

	expect(anchor.tagName).toBe('A')

	expect(anchor).toHaveAttribute('href', LINK_HREF)
}

describe('component pass-through', () => {
	for (const subject of passThrough) {
		it(`${subject.slot} passes through HTML attributes`, () => passesThrough(subject))
	}

	// A corpus that declared nothing would sweep nothing, and say so by passing.
	it('has subjects to sweep', () => {
		expect(passThrough).not.toHaveLength(0)
	})
})

describe('component skeletons', () => {
	for (const subject of skeletons) {
		it(`${subject.absentSlot} pairs with an explicit skeleton in loading trees`, () =>
			drawsSkeleton(subject))
	}

	it('has subjects to sweep', () => {
		expect(skeletons).not.toHaveLength(0)
	})
})

describe('component links', () => {
	for (const subject of links) {
		it(`${subject.slot} renders as a link when href is provided`, () => becomesLink(subject))
	}

	it('has subjects to sweep', () => {
		expect(links).not.toHaveLength(0)
	})
})

/**
 * Teeth checks: each sweep's assertion must be able to fail, or a corpus that
 * quietly stopped declaring subjects would read as green.
 *
 * Each check runs the sweep's own body on a subject built to break it, and
 * expects the body to throw. A sweep assertion that grows weaker therefore
 * fails here too.
 */
describe('capability sweeps: teeth checks', () => {
	it('fails a component that drops the props it is given', () => {
		expect(() =>
			passesThrough({ render: () => <div data-slot="dropping" />, slot: 'dropping' }),
		).toThrow()
	})

	it('fails a silhouette that leaks the real component', () => {
		expect(() =>
			drawsSkeleton({
				element: (
					<div data-slot="leaked">
						<div data-slot="placeholder" />
					</div>
				),
				absentSlot: 'leaked',
			}),
		).toThrow()
	})

	it('fails a silhouette that draws nothing', () => {
		expect(() => drawsSkeleton({ element: <div />, absentSlot: 'absent' })).toThrow()
	})

	it('fails a silhouette that draws the wrong count', () => {
		expect(() =>
			drawsSkeleton({
				element: <div data-slot="placeholder" />,
				absentSlot: 'absent',
				placeholders: 2,
			}),
		).toThrow()
	})

	it('fails a subject that does not become an anchor', () => {
		expect(() =>
			becomesLink({ render: () => <span data-slot="not-a-link" />, slot: 'not-a-link' }),
		).toThrow()
	})

	it('fails an anchor that does not carry the href it was given', () => {
		expect(() =>
			becomesLink({
				render: () => (
					<a href="/elsewhere" data-slot="elsewhere">
						Elsewhere
					</a>
				),
				slot: 'elsewhere',
			}),
		).toThrow()
	})
})
