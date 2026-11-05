import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { useNavigationScroll } from '../app/use-navigation-scroll.ts'

// A pick in the search closes the palette, and the palette gives the focus
// back to its opener, such as a button in the header. When the pick goes to
// an anchor, the focus goes to the anchor, so that the next Tab starts there
// and does not scroll the box back to the opener.

function Page() {
	const scroller = useNavigationScroll('/button')

	return (
		<div ref={scroller}>
			<button type="button">Search</button>
			<h2 id="disabled">
				<a href="#disabled">Disabled</a>
			</h2>
			<button type="button">
				<span id="api-Button">{'<Button />'}</span>
			</button>
		</div>
	)
}

function renderPage(path: string) {
	const router = createMemoryRouter([{ path: '/button', Component: Page }], {
		initialEntries: [path],
	})

	// The router adds a window "pagehide" listener, and its disposal removes it.
	onTestFinished(() => router.dispose())

	render(<RouterProvider router={router} />)

	screen.getByRole('button', { name: 'Search' }).focus()

	return router
}

describe('useNavigationScroll', () => {
	it('focuses the link of a heading of the hash, without a second scroll', async () => {
		const router = renderPage('/button')

		const link = screen.getByRole('link', { name: 'Disabled' })

		const focus = vi.spyOn(link, 'focus')

		await act(() => router.navigate('#disabled'))

		expect(document.activeElement).toBe(link)

		expect(focus).toHaveBeenCalledWith({ preventScroll: true })
	})

	it('focuses the closest focusable ancestor of the element of the hash', async () => {
		const router = renderPage('/button')

		await act(() => router.navigate('#api-Button'))

		expect(document.activeElement).toBe(screen.getByRole('button', { name: '<Button />' }))
	})

	it('keeps the focus for a hash with no element', async () => {
		const router = renderPage('/button')

		await act(() => router.navigate('#missing'))

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Search' }))
	})

	it('keeps the focus on a move back through the history', async () => {
		const router = renderPage('/button#disabled')

		await act(() => router.navigate('/button'))

		const search = screen.getByRole('button', { name: 'Search' })

		search.focus()

		await act(() => router.navigate(-1))

		expect(router.state.location.hash).toBe('#disabled')

		expect(document.activeElement).toBe(search)
	})

	it('keeps the focus at the load of a hash', () => {
		const { href } = window.location

		window.history.replaceState(null, '', '/button#disabled')

		onTestFinished(() => window.history.replaceState(null, '', href))

		const before = document.activeElement

		const router = createMemoryRouter([{ path: '/button', Component: Page }], {
			initialEntries: ['/button#disabled'],
		})

		onTestFinished(() => router.dispose())

		render(<RouterProvider router={router} />)

		expect(document.activeElement).toBe(before)
	})
})
