// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NumbersHeader } from '../components/numbers-header/numbers-header'
import type { Route } from '../utilities/seed'

vi.mock('../components/numbers-menu', () => ({ NumbersMenu: () => null }))

afterEach(cleanup)

describe('NumbersHeader', () => {
	it.each<[Route, string]>([
		['solo', 'Solo'],
		['vsCpu', 'Vs CPU'],
		['daily', 'Daily puzzle'],
	])('shows the trail Numbers, then the route %s as the current page', (route, label) => {
		render(
			<UIProvider>
				<NumbersHeader route={route} />
			</UIProvider>,
		)

		const trail = screen.getByRole('navigation')

		const numbers = within(trail).getByRole('link', { name: 'Numbers' })

		// Numbers leads to Solo, as the Solo item of the menu does.
		expect(numbers.getAttribute('href')).toBe('/')

		const current = within(trail).getByText(label).closest('[aria-current="page"]')

		expect(current).not.toBeNull()

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Numbers')
	})
})
