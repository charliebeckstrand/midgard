// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { createElement as h } from 'react'
import { ToastProvider } from 'ui/toast'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ElectionsFooter } from '../components/elections-footer'
import { ReportingRow } from '../components/race-summary'

// The Refresh button of the footer reads the router.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

afterEach(cleanup)

/** The class of the status dot in a render. */
function dotClass(container: HTMLElement): string | null {
	return container.querySelector('[data-slot="status-dot"]')?.getAttribute('class') ?? null
}

describe('ElectionsFooter', () => {
	it('shows the dot of a race that is not called while votes are counted, because green is for a call', () => {
		// A failed refresh of the footer shows a toast, so the footer needs a toast queue.
		const footer = render(
			h(
				ToastProvider,
				null,
				h(ElectionsFooter, { counting: true, updated: '2026-11-05T02:00:00.000Z' }),
			),
		)

		const row = render(h(ReportingRow, { reporting: 50, called: false }))

		expect(dotClass(footer.container)).not.toBeNull()

		expect(dotClass(footer.container)).toBe(dotClass(row.container))
	})
})
