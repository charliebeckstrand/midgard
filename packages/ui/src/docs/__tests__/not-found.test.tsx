import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NotFound from '../app/routes/not-found.tsx'

// The not-found page states that no page is at the path. The sidebar holds
// each page, so the not-found page has no link of its own.

describe('the not-found page', () => {
	it('states that no page is at the path, with no link', () => {
		render(<NotFound />)

		expect(screen.queryByText('Page not found')).not.toBeNull()

		expect(screen.queryByRole('link')).toBeNull()
	})
})
