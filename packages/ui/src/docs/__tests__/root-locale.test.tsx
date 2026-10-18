import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppearanceProvider } from 'ui/providers/appearance'
import { useLocale } from 'ui/providers/locale'
import { describe, expect, it, onTestFinished } from 'vitest'
import App from '../app/root.tsx'
import { restoreRootAfterCase } from './restore-root.ts'

// The build renders each page in Node, and the browser hydrates it. A page with
// no locale reads the runtime default of each side, and the two can differ. So
// the shell gives each page a fixed locale until hydration, and then the locale
// that the reader chose in the settings.

/** Writes the locale tag that the page reads from the shell, or `none`. */
function LocaleProbe() {
	return <output data-testid="locale">{useLocale().locale ?? 'none'}</output>
}

/** Renders the shell at a routed page that writes its locale. */
function renderShell() {
	restoreRootAfterCase()

	// The shell reads the matched routes, so it needs a data router, as the app has.
	const router = createMemoryRouter(
		[{ path: '/', Component: App, children: [{ path: 'probe', Component: LocaleProbe }] }],
		{ initialEntries: ['/probe'] },
	)

	// The router adds a window "pagehide" listener, and its disposal removes it.
	onTestFinished(() => router.dispose())

	render(
		<AppearanceProvider>
			<RouterProvider router={router} />
		</AppearanceProvider>,
	)
}

describe('docs app shell', () => {
	it('gives each page the en locale', () => {
		renderShell()

		expect(screen.getByTestId('locale').textContent).toBe('en')
	})

	it('gives each page the locale that the reader chose', () => {
		localStorage.setItem('locale', 'es')

		onTestFinished(() => localStorage.removeItem('locale'))

		renderShell()

		expect(screen.getByTestId('locale').textContent).toBe('es')
	})

	it('puts the language picker in the settings of the header', async () => {
		renderShell()

		// The navbar and the header both hold the actions. The first button opens the dialog.
		await userEvent.click(screen.getAllByRole('button', { name: 'Settings' })[0] as HTMLElement)

		await screen.findByRole('dialog', { name: 'Settings' })

		expect(screen.getByRole('combobox', { name: 'Language' }).textContent).toBe('System')
	})
})
