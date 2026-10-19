import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as core from '../../core'
import { useA11yAnnouncements } from '../../hooks/a11y/use-a11y-announcements'

// The unit project runs `isolate: false`, so one module registry serves every
// file in the worker; spying the live namespace binding the hook reads through
// patches the shared singleton module object in place, independent of suite
// import order.
describe('useA11yAnnouncements', () => {
	let announce: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		announce = vi.spyOn(core, 'announce')
	})

	it('stays silent on the initial message', () => {
		renderHook(({ message }) => useA11yAnnouncements(message), {
			initialProps: { message: '5 results' },
		})

		expect(announce).not.toHaveBeenCalled()
	})

	it('announces when the message changes', () => {
		const { rerender } = renderHook(({ message }) => useA11yAnnouncements(message), {
			initialProps: { message: '5 results' },
		})

		rerender({ message: '3 results' })

		expect(announce).toHaveBeenCalledWith('3 results', { assertive: false })
	})

	it('skips consecutive duplicate messages', () => {
		const { rerender } = renderHook(({ message }) => useA11yAnnouncements(message), {
			initialProps: { message: 'a' },
		})

		rerender({ message: 'b' })

		rerender({ message: 'b' })

		expect(announce).toHaveBeenCalledTimes(1)
	})

	it('ignores empty messages', () => {
		const { rerender } = renderHook(
			({ message }: { message: string | null }) => useA11yAnnouncements(message),
			{
				initialProps: { message: 'a' as string | null },
			},
		)

		rerender({ message: null })

		expect(announce).not.toHaveBeenCalled()
	})

	// A string, then a clear, then the same string is not a consecutive duplicate.
	it('announces a message again after a clear', () => {
		const { rerender } = renderHook(
			({ message }: { message: string | null }) => useA11yAnnouncements(message),
			{
				initialProps: { message: 'a' as string | null },
			},
		)

		rerender({ message: 'b' })

		rerender({ message: null })

		rerender({ message: 'b' })

		expect(announce).toHaveBeenCalledTimes(2)

		expect(announce).toHaveBeenLastCalledWith('b', { assertive: false })
	})

	it('announces the first message again after a clear', () => {
		const { rerender } = renderHook(
			({ message }: { message: string | null }) => useA11yAnnouncements(message),
			{
				initialProps: { message: 'a' as string | null },
			},
		)

		rerender({ message: null })

		rerender({ message: 'a' })

		expect(announce).toHaveBeenCalledWith('a', { assertive: false })
	})

	it('forwards the assertive option', () => {
		const { rerender } = renderHook(
			({ message }) => useA11yAnnouncements(message, { assertive: true }),
			{
				initialProps: { message: 'a' },
			},
		)

		rerender({ message: 'b' })

		expect(announce).toHaveBeenCalledWith('b', { assertive: true })
	})

	it('does not announce while disabled', () => {
		const { rerender } = renderHook(
			({ message, enabled }) => useA11yAnnouncements(message, { enabled }),
			{
				initialProps: { message: 'a', enabled: false },
			},
		)

		rerender({ message: 'b', enabled: false })

		expect(announce).not.toHaveBeenCalled()
	})
})
