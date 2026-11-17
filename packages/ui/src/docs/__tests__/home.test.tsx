import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import Home from '../app/routes/home.tsx'

// The home page shows each page of the docs in a list for each section. The
// field above the lists shows only the pages that match its text.

function renderHome() {
	render(
		<MemoryRouter>
			<Home />
		</MemoryRouter>,
	)

	return screen.getByRole('searchbox', { name: 'Filter pages' })
}

describe('the home page', () => {
	it('shows a list of the pages of each section', () => {
		renderHome()

		const components = screen.getByRole('list', { name: 'Components' })

		expect(within(components).getByRole('link', { name: 'Button' }).getAttribute('href')).toBe(
			'/button',
		)

		expect(screen.queryByRole('list', { name: 'Modules' })).not.toBeNull()
	})

	it('shows only the pages that match the filter, and only their sections', async () => {
		const field = renderHome()

		await userEvent.type(field, 'date')

		const links = within(screen.getByRole('list', { name: 'Components' })).getAllByRole('link')

		expect(links.map((link) => link.textContent)).toEqual(['DateInput', 'DatePicker', 'DateTime'])

		expect(screen.queryByRole('list', { name: 'Modules' })).toBeNull()
	})

	it('matches the name of a section', async () => {
		const field = renderHome()

		await userEvent.type(field, 'modules')

		expect(screen.queryByRole('list', { name: 'Modules' })).not.toBeNull()

		expect(screen.queryByRole('list', { name: 'Components' })).toBeNull()
	})

	it('tells the reader when no page matches', async () => {
		const field = renderHome()

		await userEvent.type(field, 'zzzz')

		expect(screen.queryByRole('list')).toBeNull()

		expect(screen.queryByText('No page matches the filter.')).not.toBeNull()
	})
})
