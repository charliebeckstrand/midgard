// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { COPY_TIMEOUT, loadCopy, renderInLocale } from './copy.tsx'

// The board of the build-and-save demo holds the titles of its tiles in the
// language that saved it. Each language keeps its own board, so a board that
// the reader saves in English does not show its English titles on the
// Spanish page.

/** Renders the demo in `locale`. */
async function renderDemo(locale: string) {
	const { default: Demo } = await loadCopy('../pages/modules/dashboard/build-and-save.tsx', locale)

	return renderInLocale(<Demo />, locale)
}

describe('dashboard build-and-save demo', () => {
	afterEach(() => localStorage.clear())

	it(
		'does not load the board that another language saved',
		async () => {
			const english = await renderDemo('en')

			fireEvent.click(screen.getByRole('combobox', { name: 'Template' }))

			fireEvent.click(await screen.findByRole('option', { name: /Operations/ }))

			expect(await screen.findAllByText('Orders')).not.toHaveLength(0)

			await waitFor(() => expect(localStorage.length).toBe(1))

			english.unmount()

			await renderDemo('es')

			expect(await screen.findAllByText('Ingresos mensuales')).not.toHaveLength(0)

			expect(screen.queryAllByText('Orders')).toHaveLength(0)
		},
		COPY_TIMEOUT,
	)
})
