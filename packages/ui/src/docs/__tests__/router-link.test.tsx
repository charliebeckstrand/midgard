import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, createRoutesStub, RouterProvider, useNavigate } from 'react-router'
import { describe, expect, onTestFinished, vi } from 'vitest'
import { it } from '../../__tests__/helpers/fake-clock'
import { NavigateContext, RouterLink } from '../app/router-link.tsx'

// The docs link reads only the `navigate` of the shell, so a page switch does
// not render each item of the sidebar again. It must still follow the rules of
// the `Link` of React Router for a click.

function Shell() {
	return (
		<NavigateContext value={useNavigate()}>
			<RouterLink href="/menu">Menu</RouterLink>
			<RouterLink href="/button">Button</RouterLink>
			<RouterLink href="#disabled">Disabled</RouterLink>
			<RouterLink href="https://example.com">Example</RouterLink>
			<RouterLink href="/menu" target="_blank">
				Menu in a new tab
			</RouterLink>
		</NavigateContext>
	)
}

function renderShell(path: string) {
	const router = createMemoryRouter(
		[
			{ path: '/button', Component: Shell },
			{ path: '/menu', Component: Shell },
		],
		{ initialEntries: [path] },
	)

	// The router adds a window "pagehide" listener, and its disposal removes it.
	onTestFinished(() => router.dispose())

	render(<RouterProvider router={router} />)

	return router
}

/**
 * Clicks a link, and gives `true` when the docs link handled the click. A
 * click that the link leaves to the browser stops at the document, as jsdom
 * cannot load another document.
 */
function click(name: string, init: MouseEventInit = {}): boolean {
	let handled = false

	document.addEventListener(
		'click',
		(event) => {
			handled = event.defaultPrevented

			event.preventDefault()
		},
		{ once: true },
	)

	fireEvent.click(screen.getByRole('link', { name }), { button: 0, ...init })

	return handled
}

describe('RouterLink', () => {
	it('goes to a page of the site through the router', () => {
		const router = renderShell('/button')

		expect(click('Menu')).toBe(true)

		expect(router.state.location.pathname).toBe('/menu')

		expect(router.state.historyAction).toBe('PUSH')
	})

	it('replaces the entry for a click on the current page', () => {
		const { href } = window.location

		window.history.replaceState(null, '', '/button')

		onTestFinished(() => window.history.replaceState(null, '', href))

		const router = renderShell('/button')

		expect(click('Button')).toBe(true)

		expect(router.state.historyAction).toBe('REPLACE')
	})

	// The browser scrolls to the element of a hash and fires `popstate`. The
	// router then restores the scroll position of the first entry of the tab.
	it('goes to an element of the current page through the router', () => {
		const router = renderShell('/button')

		expect(click('Disabled')).toBe(true)

		expect(router.state.location).toMatchObject({ pathname: '/button', hash: '#disabled' })

		expect(router.state.historyAction).toBe('PUSH')
	})

	it('leaves a modified click, another target, and another host to the browser', () => {
		const router = renderShell('/button')

		expect(click('Menu', { metaKey: true })).toBe(false)

		expect(click('Menu', { ctrlKey: true })).toBe(false)

		expect(click('Menu in a new tab')).toBe(false)

		expect(click('Example')).toBe(false)

		expect(router.state.location.pathname).toBe('/button')
	})
})

// The prefetch of React Router needs the context of the framework, which the
// routes stub gives. The stub names one module for each route.
describe('RouterLink prefetch', () => {
	function renderStub() {
		// The stub gives no handle to dispose its router, so the test removes the
		// window "pagehide" listener of the router itself.
		const listen = vi.spyOn(window, 'addEventListener')

		onTestFinished(() => {
			for (const [type, listener] of listen.mock.calls) {
				if (type === 'pagehide') window.removeEventListener(type, listener)
			}
		})

		const Stub = createRoutesStub([
			{ path: '/button', Component: Shell },
			{ path: '/menu', Component: Shell },
		])

		render(<Stub initialEntries={['/button']} />)
	}

	/** The count of the module preloads in the document. */
	function preloads(): number {
		return document.querySelectorAll('link[rel="modulepreload"]').length
	}

	it('loads the code of a page 100 ms after a hover', async ({ clock }) => {
		renderStub()

		// The count starts from the preloads already in the head. A test file that
		// runs before this one in the same worker can leave one there: a server
		// render under the client React DOM writes its module preloads to the
		// document.
		const before = preloads()

		fireEvent.mouseEnter(screen.getByRole('link', { name: 'Menu' }))

		expect(preloads()).toBe(before)

		await clock.advance(100)

		expect(preloads()).toBe(before + 1)
	})
})
