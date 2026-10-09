// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createListenerRegistry } from '../../utilities/listener-registry'

type Source = { id: number; listener: ((event: string) => void) | null }

/** A registry over fake sources that records each attach and detach. */
function setup(keep?: boolean) {
	let made = 0

	const attach = vi.fn()

	const detach = vi.fn()

	const registry = createListenerRegistry<Source, string>({
		source: () => {
			made += 1

			return { id: made, listener: null }
		},
		attach: (source, key, listener) => {
			attach(key)

			source.listener = listener

			return () => {
				detach(key)

				source.listener = null
			}
		},
		keep,
	})

	const fire = (key: string, event: string) => registry.source(key)?.listener?.(event)

	return { registry, attach, detach, fire }
}

describe('createListenerRegistry', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('attaches one listener for each key and dispatches in subscription order', () => {
		const { registry, attach, fire } = setup()

		const calls: string[] = []

		const offA = registry.subscribe('k', (event) => calls.push(`a:${event}`))

		const offB = registry.subscribe('k', (event) => calls.push(`b:${event}`))

		const offOther = registry.subscribe('other', (event) => calls.push(`other:${event}`))

		expect(attach.mock.calls).toEqual([['k'], ['other']])

		fire('k', 'x')

		expect(calls).toEqual(['a:x', 'b:x'])

		offA()

		offB()

		offOther()
	})

	it('detaches only when the last subscriber leaves, in any order', () => {
		const { registry, detach } = setup()

		const offA = registry.subscribe('k', () => {})

		const offB = registry.subscribe('k', () => {})

		const offC = registry.subscribe('k', () => {})

		offB()

		offA()

		expect(detach).not.toHaveBeenCalled()

		offC()

		expect(detach).toHaveBeenCalledTimes(1)

		expect(registry.source('k')).toBeUndefined()
	})

	it('ignores a second call to an unsubscribe', () => {
		const { registry, detach } = setup()

		const offA = registry.subscribe('k', () => {})

		const offB = registry.subscribe('k', vi.fn())

		offA()

		offA()

		expect(detach).not.toHaveBeenCalled()

		offB()

		offB()

		expect(detach).toHaveBeenCalledTimes(1)
	})

	it('makes a new source after the last subscriber leaves, unless it keeps the entry', () => {
		const dropping = setup()

		dropping.registry.subscribe('k', () => {})()

		const offDropped = dropping.registry.subscribe('k', () => {})

		expect(dropping.registry.source('k')?.id).toBe(2)

		offDropped()

		const keeping = setup(true)

		keeping.registry.subscribe('k', () => {})()

		expect(keeping.registry.source('k')?.id).toBe(1)

		const offKept = keeping.registry.subscribe('k', () => {})

		expect(keeping.registry.source('k')?.id).toBe(1)

		expect(keeping.attach).toHaveBeenCalledTimes(2)

		offKept()

		expect(keeping.detach).toHaveBeenCalledTimes(2)
	})

	it('does not let an old unsubscribe touch an entry made after its teardown', () => {
		const { registry, detach, fire } = setup()

		const offOld = registry.subscribe('k', () => {})

		offOld()

		const handler = vi.fn()

		const offNew = registry.subscribe('k', handler)

		offOld()

		expect(detach).toHaveBeenCalledTimes(1)

		fire('k', 'x')

		expect(handler).toHaveBeenCalledTimes(1)

		offNew()
	})

	it('dispatches over a copy, so an unsubscribe during a dispatch skips no handler', () => {
		const { registry, detach, fire } = setup()

		const b = vi.fn()

		let offB = () => {}

		const offA = registry.subscribe('k', () => offB())

		offB = registry.subscribe('k', b)

		fire('k', 'x')

		expect(b).toHaveBeenCalledTimes(1)

		fire('k', 'y')

		expect(b).toHaveBeenCalledTimes(1)

		offA()

		expect(detach).toHaveBeenCalledTimes(1)
	})

	it('runs the other handlers when one throws, and throws the error again in a microtask', () => {
		const microtask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => {})

		const { registry, fire } = setup()

		const b = vi.fn()

		const offA = registry.subscribe('k', () => {
			throw new Error('boom')
		})

		const offB = registry.subscribe('k', b)

		fire('k', 'x')

		expect(b).toHaveBeenCalledTimes(1)

		expect(microtask).toHaveBeenCalledTimes(1)

		offA()

		offB()
	})
})
