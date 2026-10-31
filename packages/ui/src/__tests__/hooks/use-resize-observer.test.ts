import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResizeObserver } from '../../hooks/use-resize-observer'
import { type ResizeObserverStub, stubResizeObserver } from '../helpers/stub-resize-observer'

/**
 * Renders the hook over a ref that holds `element`. `callback` is a prop, so
 * `rerender({ callback })` can change its identity.
 */
function observe(element: HTMLElement | null, callback: () => void = () => {}) {
	return renderHook(
		({ callback }: { callback: () => void }) => {
			const ref = useRef(element)

			useResizeObserver(ref, callback)
		},
		{ initialProps: { callback } },
	)
}

describe('useResizeObserver', () => {
	let observers: ResizeObserverStub[]

	beforeEach(() => {
		observers = stubResizeObserver()
	})

	it('observes the element and constructs exactly one ResizeObserver', () => {
		const element = document.createElement('div')

		observe(element)

		expect(observers).toHaveLength(1)

		expect(observers[0]?.observe).toHaveBeenCalledWith(element)
	})

	it('disconnects on unmount', () => {
		const { unmount } = observe(document.createElement('div'))

		expect(observers[0]?.disconnect).not.toHaveBeenCalled()

		unmount()

		expect(observers[0]?.disconnect).toHaveBeenCalledTimes(1)
	})

	it('short-circuits without constructing an observer when ref.current is null', () => {
		const callback = vi.fn()

		observe(null, callback)

		expect(observers).toHaveLength(0)

		expect(callback).not.toHaveBeenCalled()
	})

	it('does not re-subscribe when an unrelated re-render keeps the callback identity stable', () => {
		const callback = vi.fn()

		const { rerender } = observe(document.createElement('div'), callback)

		expect(observers).toHaveLength(1)

		expect(callback).toHaveBeenCalledTimes(1)

		rerender({ callback })

		rerender({ callback })

		// Stable callback + stable ref: effect deps unchanged, no re-subscribe.
		expect(observers).toHaveLength(1)

		expect(callback).toHaveBeenCalledTimes(1)
	})

	it('keeps one subscription across a changing callback identity', () => {
		const { rerender } = observe(document.createElement('div'), () => {})

		expect(observers).toHaveLength(1)

		rerender({ callback: () => {} })

		// An inline closure is safe: the effect event holds the identity steady, so
		// the observer neither re-subscribes nor re-fires its attach callback.
		expect(observers).toHaveLength(1)

		expect(observers[0]?.disconnect).not.toHaveBeenCalled()
	})

	it('raises the latest callback after the identity changes', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { rerender } = observe(document.createElement('div'), first)

		expect(first).toHaveBeenCalledTimes(1)

		rerender({ callback: second })

		const instance = observers[0]

		instance?.callback([], instance as unknown as ResizeObserver)

		// The resize reaches the current callback, not the one captured at attach.
		expect(second).toHaveBeenCalledTimes(1)

		expect(first).toHaveBeenCalledTimes(1)
	})
})
