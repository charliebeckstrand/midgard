import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router'
import { describe, expect, it, onTestFinished } from 'vitest'
import { NavigateContext, RouterLink } from '../app/router-link.tsx'

// The docs link reads only the `navigate` of the shell, so a page switch does
// not render each item of the sidebar again. It must still follow the rules of
// the `Link` of React Router for a click.

function Shell() {
	return (
		<NavigateContext value={useNavigate()}>
			<RouterLink href="/menu">Menu</RouterLink>
			<RouterLink href="/button">Button</RouterLink>
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

	it('leaves a modified click, another target, and another host to the browser', () => {
		const router = renderShell('/button')

		expect(click('Menu', { metaKey: true })).toBe(false)

		expect(click('Menu', { ctrlKey: true })).toBe(false)

		expect(click('Menu in a new tab')).toBe(false)

		expect(click('Example')).toBe(false)

		expect(router.state.location.pathname).toBe('/button')
	})
})
