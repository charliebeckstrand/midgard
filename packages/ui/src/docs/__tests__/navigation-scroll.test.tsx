import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
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

	it('restores the scroll of a page on a move back and forward through the history', async () => {
		const { box, router, scroll } = renderShell('/button')

		scroll(300)

		await act(() => router.navigate('/dialog'))

		expect(box.scrollTop).toBe(0)

		scroll(120)

		await act(() => router.navigate(-1))

		expect(box.scrollTop).toBe(300)

		await act(() => router.navigate(1))

		expect(box.scrollTop).toBe(120)
	})

	it('restores the scroll of an entry with a hash, not the element of the hash', async () => {
		const { box, intoView, router, scroll } = renderShell('/dialog')

		await act(() => router.navigate('/button#api-Button'))

		expect(intoView).toHaveBeenCalledOnce()

		scroll(900)

		await act(() => router.navigate('/select'))

		await act(() => router.navigate(-1))

		expect(box.scrollTop).toBe(900)

		expect(intoView).toHaveBeenCalledOnce()
	})

	it('restores the scroll of an entry of the same page', async () => {
		const { box, router, scroll } = renderShell('/button')

		scroll(200)

		await act(() => router.navigate('/button#api-Button'))

		scroll(900)

		await act(() => router.navigate(-1))

		expect(box.scrollTop).toBe(200)
	})

	it('restores the scroll of an entry that the reader did not scroll', async () => {
		const { box, router, scroll } = renderShell('/button')

		scroll(500)

		// A tab of the same page keeps the scroll, so the box gives no scroll event.
		await act(() => router.navigate('/button/examples'))

		await act(() => router.navigate('/dialog'))

		await act(() => router.navigate(-1))

		expect(box.scrollTop).toBe(500)
	})

	it('goes to the element of the hash on a move back to an entry before the load', async () => {
		const router = createMemoryRouter([{ path: '*', Component: Shell }], {
			initialEntries: ['/button#api-Button', '/dialog'],
		})

		onTestFinished(() => router.dispose())

		render(<RouterProvider router={router} />)

		const intoView = vi.spyOn(screen.getByText('<Button />'), 'scrollIntoView')

		await act(() => router.navigate(-1))

		expect(intoView).toHaveBeenCalledOnce()
	})
})

// The shell keeps one box for all pages, and the page is the path without its
// tab.
function Shell() {
	const scroller = useNavigationScroll(useLocation().pathname.split('/').slice(0, 2).join('/'))

	return (
		<div ref={scroller} data-testid="box">
			<span id="api-Button">{'<Button />'}</span>
		</div>
	)
}

function renderShell(path: string) {
	const router = createMemoryRouter([{ path: '*', Component: Shell }], {
		initialEntries: [path],
	})

	onTestFinished(() => router.dispose())

	render(<RouterProvider router={router} />)

	const box = screen.getByTestId('box')

	// jsdom does no layout, so a scroll of the box only sets its scroll.
	box.scrollTo = ((_x: number, top: number) => {
		box.scrollTop = top
	}) as typeof box.scrollTo

	const intoView = vi.spyOn(screen.getByText('<Button />'), 'scrollIntoView')

	const scroll = (top: number) => {
		box.scrollTop = top

		box.dispatchEvent(new Event('scroll'))
	}

	return { box, intoView, router, scroll }
}
