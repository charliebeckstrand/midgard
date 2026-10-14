import { describe, expect, it, vi } from 'vitest'
import { onRouterTransitionStart } from '../events'

const { recordEvent } = vi.hoisted(() => ({ recordEvent: vi.fn() }))

vi.mock('ui/events', () => ({ recordEvent }))

describe('onRouterTransitionStart', () => {
	it('records the start of each navigation as a route event, with the kind of a navigation that is not a push', () => {
		onRouterTransitionStart('/week/3', 'push')

		onRouterTransitionStart('/week/3?team=nyj', 'replace')

		onRouterTransitionStart('/', 'traverse')

		expect(recordEvent.mock.calls).toEqual([
			['route', 'navigate /week/3'],
			['route', 'replace /week/3?team=nyj'],
			['route', 'traverse /'],
		])
	})
})
