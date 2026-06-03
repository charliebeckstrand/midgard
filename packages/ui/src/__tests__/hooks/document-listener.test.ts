import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribeDocumentEvent } from '../../hooks/document-listener'

describe('subscribeDocumentEvent', () => {
	let addSpy: ReturnType<typeof vi.spyOn>
	let removeSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		addSpy = vi.spyOn(document, 'addEventListener')
		removeSpy = vi.spyOn(document, 'removeEventListener')
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('attaches one document listener for many subscribers of the same event', () => {
		const a = vi.fn()
		const b = vi.fn()

		const unsubA = subscribeDocumentEvent('pointerdown', a)
		const unsubB = subscribeDocumentEvent('pointerdown', b)

		expect(addSpy.mock.calls.filter((call: unknown[]) => call[0] === 'pointerdown')).toHaveLength(1)

		// Every subscriber still receives the event.
		document.dispatchEvent(new Event('pointerdown'))

		expect(a).toHaveBeenCalledTimes(1)
		expect(b).toHaveBeenCalledTimes(1)

		// The listener stays attached until the last subscriber leaves.
		unsubA()

		expect(
			removeSpy.mock.calls.filter((call: unknown[]) => call[0] === 'pointerdown'),
		).toHaveLength(0)

		unsubB()

		expect(
			removeSpy.mock.calls.filter((call: unknown[]) => call[0] === 'pointerdown'),
		).toHaveLength(1)
	})

	it('keeps a separate listener per event type', () => {
		const onKey = vi.fn()
		const onPointer = vi.fn()

		const unsubKey = subscribeDocumentEvent('keydown', onKey)
		const unsubPointer = subscribeDocumentEvent('pointerdown', onPointer)

		expect(addSpy.mock.calls.filter((call: unknown[]) => call[0] === 'keydown')).toHaveLength(1)
		expect(addSpy.mock.calls.filter((call: unknown[]) => call[0] === 'pointerdown')).toHaveLength(1)

		document.dispatchEvent(new Event('keydown'))

		expect(onKey).toHaveBeenCalledTimes(1)
		expect(onPointer).not.toHaveBeenCalled()

		unsubKey()
		unsubPointer()
	})

	it('stops dispatching to a handler once it unsubscribes', () => {
		const a = vi.fn()
		const b = vi.fn()

		const unsubA = subscribeDocumentEvent('pointerdown', a)
		const unsubB = subscribeDocumentEvent('pointerdown', b)

		unsubA()

		document.dispatchEvent(new Event('pointerdown'))

		expect(a).not.toHaveBeenCalled()
		expect(b).toHaveBeenCalledTimes(1)

		unsubB()
	})

	it('keeps invoking other handlers when one throws (native listener isolation)', () => {
		// Stub queueMicrotask so the re-thrown error is captured, not executed.
		const microtask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => {})

		const boom = new Error('boom')

		const a = vi.fn(() => {
			throw boom
		})

		const b = vi.fn()

		const unsubA = subscribeDocumentEvent('pointerdown', a)
		const unsubB = subscribeDocumentEvent('pointerdown', b)

		document.dispatchEvent(new Event('pointerdown'))

		expect(a).toHaveBeenCalledTimes(1)

		// The throw in `a` must not prevent `b` from running...
		expect(b).toHaveBeenCalledTimes(1)

		// ...and the error is surfaced out of band rather than swallowed.
		expect(microtask).toHaveBeenCalledTimes(1)

		unsubA()
		unsubB()
	})
})
