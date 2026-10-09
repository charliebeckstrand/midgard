import { cleanup, render, screen } from '@testing-library/react'
import { requireSession, type Session } from 'auth'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SignedInLayout from '../../app/(signed-in)/layout'

vi.mock('auth', () => ({ requireSession: vi.fn() }))

vi.mock('next/navigation', () => ({ usePathname: () => '/account' }))

// jsdom has no `matchMedia`, and the chrome reads the width of the viewport.
beforeEach(() => {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: false,
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}))
})

afterEach(cleanup)

// The count of the pages that mounted.
let mounts = 0

/** A page that shows which mount it is. */
function Page() {
	const [mount] = useState(() => ++mounts)

	return <p>Mount {mount}</p>
}

/** The layout of the signed-in group, for an admin with or without the second step. */
async function layout(two_step: boolean) {
	vi.mocked(requireSession).mockResolvedValue({
		user: {
			id: '550e8400-e29b-41d4-a716-446655440000',
			email: 'admin@example.com',
			name: null,
			is_active: true,
			is_verified: true,
			roles: ['admin'],
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
		},
		two_step,
	} as Session)

	return SignedInLayout({ children: <Page /> })
}

describe('SignedInLayout', () => {
	it('keeps the page mounted when the admin passes the second step', async () => {
		const { rerender } = render(await layout(false))

		expect(screen.getByText(/^Mount/).textContent).toBe('Mount 1')

		// The refresh after the second step renders the layout with the new session.
		rerender(await layout(true))

		expect(screen.getByText(/^Mount/).textContent).toBe('Mount 1')
	})
})
