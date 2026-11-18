// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NumbersHeader } from '../components/numbers-header/numbers-header'
import type { Route } from '../utilities/seed'

vi.mock('../components/numbers-menu', () => ({ NumbersMenu: () => null }))

const push = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

afterEach(() => {
	cleanup()

	vi.clearAllMocks()
})

/** Renders the header on a page of `route`, and gives its trail. */
function renderTrail(route: Route) {
	render(
		<UIProvider>
			<NumbersHeader route={route} />
		</UIProvider>,
	)

	return screen.getByRole('navigation')
}

/** The labels of the crumbs of `trail`, in order. */
const crumbs = (trail: HTMLElement) =>
	Array.from(trail.querySelectorAll('[data-slot="breadcrumb-label"]'), (label) => label.textContent)

describe('NumbersHeader', () => {
	it('shows only Numbers on the solo route, the home of the app, as the current page', () => {
		const trail = renderTrail('solo')

		expect(crumbs(trail)).toEqual(['Numbers'])

		expect(within(trail).queryByRole('link')).toBeNull()

		expect(within(trail).getByText('Numbers').closest('[aria-current="page"]')).not.toBeNull()

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Numbers')
	})

	it('shows Numbers, then Vs CPU as the current page', () => {
		const label = 'Vs CPU'

		const trail = renderTrail('vsCpu')

		expect(crumbs(trail)).toEqual(['Numbers', label])

		// Numbers leads to the solo route, as the Standard item of the menu does.
		expect(within(trail).getByRole('link', { name: 'Numbers' }).getAttribute('href')).toBe('/')

		expect(within(trail).getByText(label).closest('[aria-current="page"]')).not.toBeNull()
	})

	it('goes from Numbers to the address of a new solo seed at once, with no redirect', () => {
		const trail = renderTrail('vsCpu')

		// The click is not for the browser, so the link does not go to its own address.
		expect(fireEvent.click(within(trail).getByRole('link', { name: 'Numbers' }))).toBe(false)

		expect(push).toHaveBeenCalledTimes(1)
		expect(push.mock.calls[0]?.[0]).toMatch(/^\/[a-z0-9]{6}$/)
	})
})
