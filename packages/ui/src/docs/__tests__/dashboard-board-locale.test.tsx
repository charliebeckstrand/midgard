// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { LocaleProvider } from 'ui/providers/locale'
import { afterEach, describe, expect, it } from 'vitest'
import { CI } from '../../../vitest.base.ts'
import { catalogs } from '../app/catalogs.ts'

// The board of the build-and-save demo holds the titles of its tiles in the
// language that saved it. Each language keeps its own board, so a board that
// the reader saves in English does not show its English titles on the
// Spanish page.

// The first import of a module in a language runs the docs plugin on it,
// which is slow when the other test files run too.
const TIMEOUT = CI ? 180_000 : 60_000

async function loadDemo(locale: string): Promise<ComponentType> {
	if (locale === 'en')
		return (await import('../pages/modules/dashboard/build-and-save.tsx')).default

	const module: { default: ComponentType } = await import(
		/* @vite-ignore */ `../pages/modules/dashboard/build-and-save.tsx?lang=${locale}`
	)

	return module.default
}

function renderDemo(Demo: ComponentType, locale: string) {
	return render(
		<LocaleProvider locale={locale} catalogs={catalogs}>
			<Demo />
		</LocaleProvider>,
	)
}

describe('dashboard build-and-save demo', () => {
	afterEach(() => localStorage.clear())

	it(
		'does not load the board that another language saved',
		async () => {
			const english = renderDemo(await loadDemo('en'), 'en')

			fireEvent.click(screen.getByRole('combobox', { name: 'Template' }))

			fireEvent.click(await screen.findByRole('option', { name: /Operations/ }))

			expect(await screen.findAllByText('Orders')).not.toHaveLength(0)

			await waitFor(() => expect(localStorage.length).toBe(1))

			english.unmount()

			renderDemo(await loadDemo('es'), 'es')

			expect(await screen.findAllByText('Ingresos mensuales')).not.toHaveLength(0)

			expect(screen.queryAllByText('Orders')).toHaveLength(0)
		},
		TIMEOUT,
	)
})
