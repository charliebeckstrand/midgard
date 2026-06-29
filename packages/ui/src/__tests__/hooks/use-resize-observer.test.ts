import { renderHook } from '@testing-library/react'
import { useCallback, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useResizeObserver } from '../../hooks/use-resize-observer'

type StubInstance = {
	observe: ReturnType<typeof vi.fn>
	disconnect: ReturnType<typeof vi.fn>
	callback: ResizeObserverCallback
}

function installResizeObserverStub() {
	const original = window.ResizeObserver

	const instances: StubInstance[] = []

	class Stub {
		observe = vi.fn()
		unobserve = vi.fn()
		disconnect = vi.fn()

		callback: ResizeObserverCallback

		constructor(cb: ResizeObserverCallback) {
			this.callback = cb

			instances.push(this)
		}
	}

	// `lib.dom`'s `ResizeObserver` has overloaded constructor signatures that
	// `vi.fn()`-shaped methods don't satisfy structurally; the cast narrows to
	// the runtime contract the hook uses.
	window.ResizeObserver = Stub as unknown as typeof ResizeObserver

	return {
		instances,
		restore: () => {
			window.ResizeObserver = original
		},
	}
}

describe('useResizeObserver', () => {
	let stub: ReturnType<typeof installResizeObserverStub>

	beforeEach(() => {
		stub = installResizeObserverStub()
	})

	afterEach(() => {
		stub.restore()
	})

	it('invokes the callback synchronously on mount when ref.current is set', () => {
		const callback = vi.fn()

		const element = document.createElement('div')

		renderHook(() => {
			const ref = useRef<HTMLDivElement>(element)

			useResizeObserver(ref, callback)
		})

		expect(callback).toHaveBeenCalledTimes(1)
	})

	it('observes the element and constructs exactly one ResizeObserver', () => {
		const element = document.createElement('div')

		renderHook(() => {
			const ref = useRef<HTMLDivElement>(element)

			useResizeObserver(ref, () => {})
		})

		expect(stub.instances).toHaveLength(1)

		expect(stub.instances[0]?.observe).toHaveBeenCalledWith(element)
	})

	it('disconnects on unmount', () => {
		const element = document.createElement('div')

		const { unmount } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(element)

			useResizeObserver(ref, () => {})
		})

		expect(stub.instances[0]?.disconnect).not.toHaveBeenCalled()

		unmount()

		expect(stub.instances[0]?.disconnect).toHaveBeenCalledTimes(1)
	})

	it('short-circuits without constructing an observer when ref.current is null', () => {
		const callback = vi.fn()

		renderHook(() => {
			const ref = useRef<HTMLElement | null>(null)

			useResizeObserver(ref, callback)
		})

		expect(stub.instances).toHaveLength(0)

		expect(callback).not.toHaveBeenCalled()
	})

	it('does not re-subscribe when an unrelated re-render keeps the callback identity stable', () => {
		const callback = vi.fn()

		const element = document.createElement('div')

		const { rerender } = renderHook(
			({ unrelated: _unrelated }: { unrelated: number }) => {
				const ref = useRef<HTMLDivElement>(element)

				const stable = useCallback(callback, [])

				useResizeObserver(ref, stable)
			},
			{ initialProps: { unrelated: 0 } },
		)

		expect(stub.instances).toHaveLength(1)

		expect(callback).toHaveBeenCalledTimes(1)

		rerender({ unrelated: 1 })

		rerender({ unrelated: 2 })

		// Stable callback + stable ref: effect deps unchanged, no re-subscribe.
		expect(stub.instances).toHaveLength(1)

		expect(callback).toHaveBeenCalledTimes(1)
	})

	it('re-subscribes when the callback identity changes', () => {
		const element = document.createElement('div')

		const { rerender } = renderHook(
			({ callback }: { callback: () => void }) => {
				const ref = useRef<HTMLDivElement>(element)

				useResizeObserver(ref, callback)
			},
			{ initialProps: { callback: () => {} } },
		)

		expect(stub.instances).toHaveLength(1)

		rerender({ callback: () => {} })

		expect(stub.instances).toHaveLength(2)

		expect(stub.instances[0]?.disconnect).toHaveBeenCalledTimes(1)
	})
})
