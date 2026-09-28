import { renderHook } from '@testing-library/react'
import { useCallback, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResizeObserver } from '../../hooks/use-resize-observer'
import { type ResizeObserverStub, stubResizeObserver } from '../helpers/stub-resize-observer'

describe('useResizeObserver', () => {
	let observers: ResizeObserverStub[]

	beforeEach(() => {
		observers = stubResizeObserver()
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

		expect(observers).toHaveLength(1)

		expect(observers[0]?.observe).toHaveBeenCalledWith(element)
	})

	it('disconnects on unmount', () => {
		const element = document.createElement('div')

		const { unmount } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(element)

			useResizeObserver(ref, () => {})
		})

		expect(observers[0]?.disconnect).not.toHaveBeenCalled()

		unmount()

		expect(observers[0]?.disconnect).toHaveBeenCalledTimes(1)
	})

	it('short-circuits without constructing an observer when ref.current is null', () => {
		const callback = vi.fn()

		renderHook(() => {
			const ref = useRef<HTMLElement | null>(null)

			useResizeObserver(ref, callback)
		})

		expect(observers).toHaveLength(0)

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

		expect(observers).toHaveLength(1)

		expect(callback).toHaveBeenCalledTimes(1)

		rerender({ unrelated: 1 })

		rerender({ unrelated: 2 })

		// Stable callback + stable ref: effect deps unchanged, no re-subscribe.
		expect(observers).toHaveLength(1)

		expect(callback).toHaveBeenCalledTimes(1)
	})

	it('keeps one subscription across a changing callback identity', () => {
		const element = document.createElement('div')

		const { rerender } = renderHook(
			({ callback }: { callback: () => void }) => {
				const ref = useRef<HTMLDivElement>(element)

				useResizeObserver(ref, callback)
			},
			{ initialProps: { callback: () => {} } },
		)

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

		const element = document.createElement('div')

		const { rerender } = renderHook(
			({ callback }: { callback: () => void }) => {
				const ref = useRef<HTMLDivElement>(element)

				useResizeObserver(ref, callback)
			},
			{ initialProps: { callback: first } },
		)

		expect(first).toHaveBeenCalledTimes(1)

		rerender({ callback: second })

		const instance = observers[0]

		instance?.callback([], instance as unknown as ResizeObserver)

		// The resize reaches the current callback, not the one captured at attach.
		expect(second).toHaveBeenCalledTimes(1)

		expect(first).toHaveBeenCalledTimes(1)
	})
})
