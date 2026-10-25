import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppearanceProvider } from 'ui/providers/appearance'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import App, { ErrorBoundary } from '../app/root.tsx'
import { restoreRootAfterCase } from './restore-root.ts'

// The palette of the search is in a chunk of its own. When the load that a
// press of the search button asks for fails, the error boundary of the shell
// shows the failure and offers a reload. Without it, the button does nothing.

vi.mock('../app/search-palette.tsx', () => {
	throw new Error('the chunk of the palette did not load')
})

describe('a failed load of the docs search', () => {
	it('shows the error of the shell, in English, when the reader presses the button', async () => {
		restoreRootAfterCase()

		// React and the router write the caught error to the console.
		vi.spyOn(console, 'error').mockImplementation(() => {})

		const router = createMemoryRouter([{ path: '/', Component: App, ErrorBoundary }])

		// The router adds a window "pagehide" listener, and its disposal removes it.
		onTestFinished(() => router.dispose())

		render(
			<AppearanceProvider>
				<RouterProvider router={router} />
			</AppearanceProvider>,
		)

		const [button] = screen.getAllByRole('button', { name: /Search docs/ })

		await act(async () => {
			if (button) fireEvent.click(button)
		})

		const heading = await screen.findByRole('heading', {
			name: 'Could not load this page',
			level: 1,
		})

		expect(heading.closest('[lang]')?.getAttribute('lang')).toBe('en')

		expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
	})
})
