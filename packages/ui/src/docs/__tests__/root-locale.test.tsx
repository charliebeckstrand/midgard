import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppearanceProvider } from 'ui/providers/appearance'
import { useLocale } from 'ui/providers/locale'
import { describe, expect, it, onTestFinished } from 'vitest'
import App from '../app/root.tsx'
import { restoreRootAfterCase } from './restore-root.ts'

// The build renders each page in Node, and the browser hydrates it. A page with
// no locale reads the runtime default of each side, and the two can differ. So
// the shell gives each page a fixed locale.

/** Writes the locale tag that the page reads from the shell, or `none`. */
function LocaleProbe() {
	return <output data-testid="locale">{useLocale().locale ?? 'none'}</output>
}

describe('docs app shell', () => {
	it('gives each page the en-US locale', () => {
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

		expect(screen.getByTestId('locale').textContent).toBe('en-US')
	})
})
