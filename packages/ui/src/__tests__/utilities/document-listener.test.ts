import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { subscribeDocumentEvent } from '../../utilities/document-listener'

/**
 * Subscribes `handler` to the document event `type`. The handler stays on the
 * module registry of `document-listener.ts`, so it unsubscribes when the case
 * finishes, also after a failure. A second unsubscribe does nothing.
 */
function subscribe<K extends keyof DocumentEventMap>(
	type: K,
	handler: (event: DocumentEventMap[K]) => void,
): () => void {
	const off = subscribeDocumentEvent(type, handler)

	onTestFinished(off)

	return off
}

/** The calls of `spy` for the event `type`. */
function callsFor(spy: ReturnType<typeof vi.spyOn>, type: string): unknown[][] {
	return spy.mock.calls.filter((call: unknown[]) => call[0] === type)
}

describe('subscribeDocumentEvent', () => {
	let addSpy: ReturnType<typeof vi.spyOn>

	let removeSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		addSpy = vi.spyOn(document, 'addEventListener')

		removeSpy = vi.spyOn(document, 'removeEventListener')
	})

	it('attaches one document listener for many subscribers of the same event', () => {
		const a = vi.fn()

		const b = vi.fn()

		const unsubA = subscribe('pointerdown', a)

		const unsubB = subscribe('pointerdown', b)

		expect(callsFor(addSpy, 'pointerdown')).toHaveLength(1)

		document.dispatchEvent(new Event('pointerdown'))

		expect(a).toHaveBeenCalledTimes(1)

		expect(b).toHaveBeenCalledTimes(1)

		// The listener stays attached until the last subscriber leaves.
		unsubA()

		expect(callsFor(removeSpy, 'pointerdown')).toHaveLength(0)

		unsubB()

		expect(callsFor(removeSpy, 'pointerdown')).toHaveLength(1)
	})

	it('keeps a separate listener per event type', () => {
		const onKey = vi.fn()

		const onPointer = vi.fn()

		subscribe('keydown', onKey)

		subscribe('pointerdown', onPointer)

		expect(callsFor(addSpy, 'keydown')).toHaveLength(1)

		expect(callsFor(addSpy, 'pointerdown')).toHaveLength(1)

		document.dispatchEvent(new Event('keydown'))

		expect(onKey).toHaveBeenCalledTimes(1)

		expect(onPointer).not.toHaveBeenCalled()
	})
})
