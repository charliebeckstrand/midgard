import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('stays silent on the initial message', () => {
		renderHook(({ m }) => useA11yAnnouncements(m), { initialProps: { m: '5 results' } })

		expect(announce).not.toHaveBeenCalled()
	})

	it('announces when the message changes', () => {
		const { rerender } = renderHook(({ m }) => useA11yAnnouncements(m), {
			initialProps: { m: '5 results' },
		})

		rerender({ m: '3 results' })

		expect(announce).toHaveBeenCalledWith('3 results', { assertive: false })
	})

	it('skips consecutive duplicate messages', () => {
		const { rerender } = renderHook(({ m }) => useA11yAnnouncements(m), {
			initialProps: { m: 'a' },
		})

		rerender({ m: 'b' })

		rerender({ m: 'b' })

		expect(announce).toHaveBeenCalledTimes(1)
	})

	it('ignores empty messages', () => {
		const { rerender } = renderHook(({ m }: { m: string | null }) => useA11yAnnouncements(m), {
			initialProps: { m: 'a' as string | null },
		})

		rerender({ m: null })

		expect(announce).not.toHaveBeenCalled()
	})

	// A string, then a clear, then the same string is not a consecutive duplicate.
	it('announces a message again after a clear', () => {
		const { rerender } = renderHook(({ m }: { m: string | null }) => useA11yAnnouncements(m), {
			initialProps: { m: 'a' as string | null },
		})

		rerender({ m: 'b' })

		rerender({ m: null })

		rerender({ m: 'b' })

		expect(announce).toHaveBeenCalledTimes(2)

		expect(announce).toHaveBeenLastCalledWith('b', { assertive: false })
	})

	it('announces the first message again after a clear', () => {
		const { rerender } = renderHook(({ m }: { m: string | null }) => useA11yAnnouncements(m), {
			initialProps: { m: 'a' as string | null },
		})

		rerender({ m: null })

		rerender({ m: 'a' })

		expect(announce).toHaveBeenCalledWith('a', { assertive: false })
	})

	it('forwards the assertive option', () => {
		const { rerender } = renderHook(({ m }) => useA11yAnnouncements(m, { assertive: true }), {
			initialProps: { m: 'a' },
		})

		rerender({ m: 'b' })

		expect(announce).toHaveBeenCalledWith('b', { assertive: true })
	})

	it('does not announce while disabled', () => {
		const { rerender } = renderHook(({ m, e }) => useA11yAnnouncements(m, { enabled: e }), {
			initialProps: { m: 'a', e: false },
		})

		rerender({ m: 'b', e: false })

		expect(announce).not.toHaveBeenCalled()
	})
})
