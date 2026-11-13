import { act, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RequestError } from 'shared/auth'
import { AppProviders } from 'shared/providers'
import { describe, expect, it, vi } from 'vitest'
import { useSetUserActive } from '../../app/(signed-in)/(dashboard)/users/users-queries'

vi.mock('../../app/(signed-in)/(dashboard)/users/users-api', () => ({
	fetchUsers: vi.fn(),
	setUserActive: vi.fn(async () => {
		throw new RequestError('An admin cannot be deactivated', 403)
	}),
}))

describe('useSetUserActive', () => {
	it('shows its error only in place, with no toast', async () => {
		const wrapper = ({ children }: { children: ReactNode }) => (
			<AppProviders>{children}</AppProviders>
		)

		const { result } = renderHook(() => useSetUserActive(), { wrapper })

		act(() => {
			result.current.mutate({ userId: 'u1', isActive: false })
		})

		await waitFor(() =>
			expect(result.current.error?.message).toBe('An admin cannot be deactivated'),
		)

		// The app client shows a toast in the same step that it sets the error, so a
		// toast would be in the document now, and it would show the error a second time.
		expect(screen.queryByText('An admin cannot be deactivated')).toBeNull()
	})
})
