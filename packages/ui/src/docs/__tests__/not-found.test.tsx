import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import NotFound from '../app/routes/not-found.tsx'

// The not-found page states that no page is at the path. The sidebar holds
// each page, so the not-found page has no link of its own.

describe('the not-found page', () => {
	it('states that no page is at the path, with no link', () => {
		render(
			<MemoryRouter initialEntries={['/button/foo']}>
				<NotFound />
			</MemoryRouter>,
		)

		expect(screen.queryByText('No page of the docs is at /button/foo.')).not.toBeNull()

		expect(screen.queryByRole('link')).toBeNull()
	})
})
