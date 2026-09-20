import { describe, expect, it } from 'vitest'
import { corpus, rows } from '../a11y/cases'
import { bySlot, renderUI } from '../helpers'

/**
 * Pass-through sweep: a component that takes DOM props forwards them to the
 * element it publishes. Derived from the shared corpus, so a new component
 * writes a `passthrough` column rather than a copy of this test
 * ([CONVENTIONS.md](../../../../../CONVENTIONS.md) §10.5).
 *
 * The sweep owns the value it spreads, so an entry cannot disagree with what is
 * asserted. A family entry names one subject per component it publishes, which
 * is why the corpus covers `dl`, `dl-term`, and `dl-details` from one row.
 */
const PASS_THROUGH_ID = 'pass-through-subject'

/** Every subject the corpus declares, named by the slot its props must reach. */
const subjects = corpus.flatMap((entry) =>
	(entry.passthrough ?? []).map((subject) => ({ ...subject, name: subject.slot })),
)

describe('component pass-through', () => {
	it.each(rows(subjects))('%s passes through HTML attributes', (_name, { render, slot }) => {
		const { container } = renderUI(render({ id: PASS_THROUGH_ID }))

		expect(bySlot(container, slot)).toHaveAttribute('id', PASS_THROUGH_ID)
	})

	// The corpus is the sweep's only input, so an empty one would pass silently.
	it('sweeps every subject the corpus declares', () => {
		expect(subjects.length).toBeGreaterThan(20)
	})
})

// Teeth check: a component that drops the props it is given must fail the
// assertion above, confirming the sweep can see a regression.
describe('component pass-through: teeth check', () => {
	function Dropping(_props: { id: string }) {
		return <div data-slot="dropping" />
	}

	it('detects a component that drops its props', () => {
		const { container } = renderUI(<Dropping id={PASS_THROUGH_ID} />)

		expect(bySlot(container, 'dropping')).not.toHaveAttribute('id', PASS_THROUGH_ID)
	})
})
