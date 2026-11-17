import pages from 'virtual:docs/pages'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import Home from '../app/routes/home.tsx'

// The home page shows the steps to set up ui, and what each section of the
// sidebar holds.

describe('the home page', () => {
	it('tells what each section of the pages holds', async () => {
		const { container } = render(
			<MemoryRouter>
				<Home />
			</MemoryRouter>,
		)

		const terms = screen.getAllByRole('term').map((term) => term.textContent)

		expect(terms).toEqual(['Components', 'Modules', 'Primitives', 'Providers', 'Structure'])

		expect(new Set(pages.map((page) => page.category)).size).toBe(terms.length)

		// Each term has a description, so a new section of the pages needs an entry.
		expect(screen.getAllByRole('definition').every((details) => details.textContent)).toBe(true)

		// The code blocks of the steps highlight after the render.
		await waitFor(() => expect(container.querySelectorAll('pre.shiki')).toHaveLength(3))
	})
})
