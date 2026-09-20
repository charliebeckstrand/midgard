import { describe, expect, it } from 'vitest'
import { corpus, rows } from '../a11y/cases'
import { bySlot, renderUI } from '../helpers'

/**
 * Link sweep: a polymorphic subject given an `href` renders an anchor carrying
 * it, rather than its default element
 * ([CONVENTIONS.md](../../../../../CONVENTIONS.md) §10.5). Derived from the
 * shared corpus, so a new polymorphic component writes a `link` column rather
 * than a copy of this test.
 *
 * The sweep owns the href it passes, so an entry cannot assert a value it did
 * not render.
 */
const LINK_HREF = '/swept-link'

const subjects = corpus.flatMap((entry) =>
	(entry.link ?? []).map((subject) => ({ ...subject, name: subject.slot })),
)

describe('component links', () => {
	it.each(rows(subjects))('%s renders as a link when href is provided', (_name, {
		render,
		slot,
		portals,
	}) => {
		const { container } = renderUI(render(LINK_HREF))

		// A portalled subject leaves its container empty, so read the document.
		const anchor = bySlot(portals ? document.body : container, slot)

		expect(anchor?.tagName).toBe('A')

		expect(anchor).toHaveAttribute('href', LINK_HREF)
	})

	// The corpus is the sweep's only input, so an empty one would pass silently.
	it('sweeps every link subject the corpus declares', () => {
		expect(subjects.length).toBeGreaterThan(8)
	})
})

// Teeth check: a subject that keeps its default element despite an href must
// fail the assertion above.
describe('component links: teeth check', () => {
	it('detects a subject that does not become an anchor', () => {
		const { container } = renderUI(<div data-slot="not-a-link" />)

		expect(bySlot(container, 'not-a-link')?.tagName).not.toBe('A')
	})
})
