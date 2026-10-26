import { render } from '@testing-library/react'
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router'
import { AppearanceProvider } from 'ui/providers/appearance'
import { onTestFinished } from 'vitest'
import App, { ErrorBoundary } from '../app/root.tsx'
import { restoreRootAfterCase } from './restore-root.ts'

/**
 * Renders the shell of the docs (`app/root.tsx`) at `path`, with `children`
 * as the routes under the root route. The root route takes the error boundary
 * of the module, as in the app. The shell reads the matched routes, so
 * it needs a data router, as the app has.
 *
 * @returns The router, so a case can navigate.
 */
export function renderShell(
	path: string,
	{ children }: { children: RouteObject[] },
): ReturnType<typeof createMemoryRouter> {
	restoreRootAfterCase()

	const router = createMemoryRouter([{ path: '/', Component: App, ErrorBoundary, children }], {
		initialEntries: [path],
	})

	// The router adds a window "pagehide" listener, and its disposal removes it.
	onTestFinished(() => router.dispose())

	render(
		<AppearanceProvider>
			<RouterProvider router={router} />
		</AppearanceProvider>,
	)

	return router
}
