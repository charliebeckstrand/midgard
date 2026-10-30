import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as core from '../../core'
import {
	type A11yAnnouncementsOptions,
	useA11yAnnouncements,
} from '../../hooks/a11y/use-a11y-announcements'

/**
 * Renders the hook with a first message. The returned function renders again
 * with the next message and the same options.
 */
function renderAnnouncer(message: string | null, options?: A11yAnnouncementsOptions) {
	const { rerender } = renderHook(
		({ message }: { message: string | null }) => useA11yAnnouncements(message, options),
		{ initialProps: { message } },
	)

	return (next: string | null) => rerender({ message: next })
}

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
		renderAnnouncer('5 results')

		expect(announce).not.toHaveBeenCalled()
	})

	it('announces when the message changes', () => {
		const rerender = renderAnnouncer('5 results')

		rerender('3 results')

		expect(announce).toHaveBeenCalledWith('3 results', { assertive: false })
	})

	it('skips consecutive duplicate messages', () => {
		const rerender = renderAnnouncer('a')

		rerender('b')

		rerender('b')

		expect(announce).toHaveBeenCalledTimes(1)
	})

	it('ignores empty messages', () => {
		const rerender = renderAnnouncer('a')

		rerender(null)

		expect(announce).not.toHaveBeenCalled()
	})

	// A string, then a clear, then the same string is not a consecutive duplicate.
	it('announces a message again after a clear', () => {
		const rerender = renderAnnouncer('a')

		rerender('b')

		rerender(null)

		rerender('b')

		expect(announce).toHaveBeenCalledTimes(2)

		expect(announce).toHaveBeenLastCalledWith('b', { assertive: false })
	})

	it('forwards the assertive option', () => {
		const rerender = renderAnnouncer('a', { assertive: true })

		rerender('b')

		expect(announce).toHaveBeenCalledWith('b', { assertive: true })
	})

	it('does not announce while disabled', () => {
		const rerender = renderAnnouncer('a', { enabled: false })

		rerender('b')

		expect(announce).not.toHaveBeenCalled()
	})
})
