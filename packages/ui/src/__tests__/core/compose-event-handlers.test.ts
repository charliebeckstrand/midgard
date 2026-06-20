import type { SyntheticEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { composeEventHandlers } from '../../core/compose-event-handlers'

const event = (defaultPrevented = false) => ({ defaultPrevented }) as SyntheticEvent

describe('composeEventHandlers', () => {
	it('runs the caller handler first, then the library handler', () => {
		const order: string[] = []

		composeEventHandlers(
			() => order.push('theirs'),
			() => order.push('ours'),
		)(event())

		expect(order).toEqual(['theirs', 'ours'])
	})

	it('skips the library handler when the caller prevents default', () => {
		const ours = vi.fn()

		composeEventHandlers(() => {}, ours)(event(true))

		expect(ours).not.toHaveBeenCalled()
	})

	it('runs the library handler when no caller handler is supplied', () => {
		const ours = vi.fn()

		composeEventHandlers(undefined, ours)(event())

		expect(ours).toHaveBeenCalledTimes(1)
	})

	it('runs the library handler despite default-prevented when the check is off', () => {
		const ours = vi.fn()

		composeEventHandlers(() => {}, ours, { checkForDefaultPrevented: false })(event(true))

		expect(ours).toHaveBeenCalledTimes(1)
	})
})
