import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../core', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../core')>()),
	announce: vi.fn(),
}))

import { announce } from '../../core'
import { useA11yAnnouncements } from '../../hooks/a11y/use-a11y-announcements'

const announceMock = vi.mocked(announce)

describe('useA11yAnnouncements', () => {
	beforeEach(() => announceMock.mockClear())

	it('stays silent on the initial message', () => {
		renderHook(({ m }) => useA11yAnnouncements(m), { initialProps: { m: '5 results' } })

		expect(announceMock).not.toHaveBeenCalled()
	})

	it('announces when the message changes', () => {
		const { rerender } = renderHook(({ m }) => useA11yAnnouncements(m), {
			initialProps: { m: '5 results' },
		})

		rerender({ m: '3 results' })

		expect(announceMock).toHaveBeenCalledWith('3 results', { assertive: false })
	})

	it('skips consecutive duplicate messages', () => {
		const { rerender } = renderHook(({ m }) => useA11yAnnouncements(m), {
			initialProps: { m: 'a' },
		})

		rerender({ m: 'b' })
		rerender({ m: 'b' })

		expect(announceMock).toHaveBeenCalledTimes(1)
	})

	it('ignores empty messages', () => {
		const { rerender } = renderHook(({ m }: { m: string | null }) => useA11yAnnouncements(m), {
			initialProps: { m: 'a' as string | null },
		})

		rerender({ m: null })

		expect(announceMock).not.toHaveBeenCalled()
	})

	it('forwards the assertive option', () => {
		const { rerender } = renderHook(({ m }) => useA11yAnnouncements(m, { assertive: true }), {
			initialProps: { m: 'a' },
		})

		rerender({ m: 'b' })

		expect(announceMock).toHaveBeenCalledWith('b', { assertive: true })
	})

	it('does not announce while disabled', () => {
		const { rerender } = renderHook(({ m, e }) => useA11yAnnouncements(m, { enabled: e }), {
			initialProps: { m: 'a', e: false },
		})

		rerender({ m: 'b', e: false })

		expect(announceMock).not.toHaveBeenCalled()
	})
})
