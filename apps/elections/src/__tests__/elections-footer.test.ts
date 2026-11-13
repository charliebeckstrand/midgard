// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ElectionsFooter } from '../components/elections-footer'
import { ReportingRow } from '../components/race-summary'

afterEach(cleanup)

/** The class of the status dot in a render. */
function dotClass(container: HTMLElement): string | null {
	return container.querySelector('[data-slot="status-dot"]')?.getAttribute('class') ?? null
}

describe('ElectionsFooter', () => {
	it('shows the dot of a race that is not called while votes are counted, because green is for a call', () => {
		const footer = render(
			h(ElectionsFooter, { counting: true, updated: '2026-11-05T02:00:00.000Z' }),
		)

		const row = render(h(ReportingRow, { reporting: 50, called: false }))

		expect(dotClass(footer.container)).not.toBeNull()

		expect(dotClass(footer.container)).toBe(dotClass(row.container))
	})

	it('opens each source in a new tab', () => {
		render(h(ElectionsFooter, { counting: false, updated: '2026-11-05T02:00:00.000Z' }))

		for (const name of ['civicAPI', 'US Census Bureau']) {
			const link = screen.getByRole('link', { name })

			expect(link.getAttribute('target')).toBe('_blank')

			expect(link.getAttribute('rel')).toBe('noopener noreferrer')
		}
	})
})
