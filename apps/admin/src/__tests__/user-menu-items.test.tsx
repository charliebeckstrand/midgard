import { act, fireEvent, render, screen } from '@testing-library/react'
import type { User } from 'auth'
import { VerifyEmailMenuItem } from 'shared/auth'
import { Menu, MenuContent } from 'ui/menu'
import { describe, expect, it, vi } from 'vitest'

const user = { is_verified: false } as User

describe('VerifyEmailMenuItem', () => {
	it('sends one link for two presses, and shows that it sent it', async () => {
		// The gateway sends one link each minute, and refuses another with a `429`.
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 204 }))
			.mockResolvedValue(Response.json({ message: 'Too many requests' }, { status: 429 }))

		vi.stubGlobal('fetch', fetch)

		render(
			<Menu defaultOpen>
				<MenuContent aria-label="Account">
					<VerifyEmailMenuItem user={user} />
				</MenuContent>
			</Menu>,
		)

		const item = screen.getByRole('menuitem', { name: 'Verify your email' })

		// Two presses, as in a double click: React renders after each one.
		act(() => {
			fireEvent.click(item)
		})

		act(() => {
			fireEvent.click(item)
		})

		await vi.waitFor(() =>
			expect(screen.getByRole('menuitem').textContent).toBe('Link sent, check your email'),
		)

		expect(fetch).toHaveBeenCalledOnce()
	})
})
