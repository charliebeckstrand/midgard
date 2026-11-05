import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import NotFound from '../app/routes/not-found.tsx'

// The link to the home page is the only action of the not-found page. It has
// the color of the text around it, so the underline is its only mark (WCAG 1.4.1).

describe('the not-found page', () => {
	it('underlines the link to the home page at rest', () => {
		render(
			<MemoryRouter>
				<NotFound />
			</MemoryRouter>,
		)

		expect(screen.getByRole('link', { name: 'See each page' }).classList).toContain('underline')
	})
})
