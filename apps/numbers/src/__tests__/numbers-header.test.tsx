// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NumbersHeader } from '../components/numbers-header/numbers-header'
import type { Route } from '../utilities/seed'

vi.mock('../components/numbers-menu', () => ({ NumbersMenu: () => null }))

afterEach(cleanup)

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
	it('shows only Numbers on Solo, the home of the app, as the current page', () => {
		const trail = renderTrail('solo')

		expect(crumbs(trail)).toEqual(['Numbers'])

		expect(within(trail).queryByRole('link')).toBeNull()

		expect(within(trail).getByText('Numbers').closest('[aria-current="page"]')).not.toBeNull()

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Numbers')
	})

	it.each<[Route, string]>([
		['vsCpu', 'Vs CPU'],
		['daily', 'Daily puzzle'],
	])('shows Numbers, then the route %s as the current page', (route, label) => {
		const trail = renderTrail(route)

		expect(crumbs(trail)).toEqual(['Numbers', label])

		// Numbers leads to Solo, as the Solo item of the menu does.
		expect(within(trail).getByRole('link', { name: 'Numbers' }).getAttribute('href')).toBe('/')

		expect(within(trail).getByText(label).closest('[aria-current="page"]')).not.toBeNull()
	})
})
