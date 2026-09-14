import { renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ThumbButtonRefs, ThumbIndex } from '../../components/slider/range/types'
import { useRangePointer } from '../../components/slider/range/use-range-pointer'
import { makePointerEvent } from '../helpers'

afterEach(() => {
	document.body.innerHTML = ''
})

function makeTrack() {
	const el = document.createElement('div')

	el.getBoundingClientRect = () => DOMRect.fromRect({ width: 100, height: 10 })

	return el
}

// The buttons attach to the document: a detached node takes no focus, so an
// assertion against `activeElement` would pass for the wrong reason.
function makeThumbs(): { refs: ThumbButtonRefs; buttons: [HTMLButtonElement, HTMLButtonElement] } {
	const lo = document.createElement('button')

	const hi = document.createElement('button')

	document.body.append(lo, hi)

	return { refs: [{ current: lo }, { current: hi }], buttons: [lo, hi] }
}

function makeEvent(overrides: Partial<ReactPointerEvent> = {}): ReactPointerEvent {
	const target = document.createElement('div')

	target.setPointerCapture = vi.fn()

	return makePointerEvent({ currentTarget: target, ...overrides })
}

function setup(
	options: { disabled?: boolean; current?: [number, number]; overlap?: 'clamp' | 'swap' } = {},
) {
	const track = makeTrack()

	const { refs, buttons } = makeThumbs()

	const setRange = vi.fn()

	const { result } = renderHook(() =>
		useRangePointer({
			min: 0,
			max: 100,
			step: 1,
			disabled: options.disabled ?? false,
			current: options.current ?? [20, 80],
			trackRef: { current: track },
			setRange,
			overlap: options.overlap ?? 'clamp',
			thumbRefs: refs,
		}),
	)

	return { api: result.current, setRange, thumbs: buttons }
}

describe('useRangePointer', () => {
	it('returns pointer handlers', () => {
		const { api } = setup()

		expect(typeof api.onPointerDown).toBe('function')

		expect(typeof api.onPointerMove).toBe('function')

		expect(typeof api.onPointerUp).toBe('function')
	})

	it('onPointerDown moves the nearest thumb to the pointer position', () => {
		const { api, setRange } = setup({ current: [20, 80] })

		// clientX=30 on a 0-100 track maps to value 30, closer to thumb 0 (20) than thumb 1 (80).
		api.onPointerDown(makeEvent({ clientX: 30 }))

		expect(setRange).toHaveBeenCalled()

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		expect(updater([20, 80])).toEqual([30, 80])
	})

	it('onPointerDown picks the upper thumb when the pointer is closer to it', () => {
		const { api, setRange } = setup({ current: [20, 80] })

		api.onPointerDown(makeEvent({ clientX: 70 }))

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		expect(updater([20, 80])).toEqual([20, 70])
	})

	// The press focuses the thumb it resolves; a press on a stack focuses thumb 1,
	// which the source states as `closestThumb`'s equidistant tie-break.
	it.each<[string, [number, number], number, ThumbIndex]>([
		['focuses the nearest thumb', [20, 80], 30, 0],
		['focuses the upper thumb when the pointer is closer to it', [20, 80], 70, 1],
		['focuses the lower thumb when the pointer lands below a stack', [50, 50], 20, 0],
		['focuses the upper thumb when the pointer lands above a stack', [50, 50], 90, 1],
		['focuses the upper thumb when the press lands on a stack', [50, 50], 50, 1],
	])('onPointerDown %s', (_name, current, clientX, thumb) => {
		const { api, thumbs } = setup({ current })

		api.onPointerDown(makeEvent({ clientX }))

		expect(document.activeElement).toBe(thumbs[thumb])
	})

	it('onPointerDown captures the pointer on the target', () => {
		const { api } = setup()

		const event = makeEvent({ clientX: 30 })

		api.onPointerDown(event)

		expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(1)
	})

	it.each<[string, { disabled?: boolean }, Partial<ReactPointerEvent>]>([
		['when disabled', { disabled: true }, {}],
		['on a non-primary press', {}, { button: 2 }],
	])('onPointerDown is a no-op %s', (_name, options, overrides) => {
		const { api, setRange } = setup(options)

		const event = makeEvent({ clientX: 30, ...overrides })

		api.onPointerDown(event)

		expect(setRange).not.toHaveBeenCalled()

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled()
	})

	it('onPointerMove does nothing before pointerdown', () => {
		const { api, setRange } = setup()

		api.onPointerMove(makeEvent({ clientX: 50 }))

		expect(setRange).not.toHaveBeenCalled()
	})

	it('onPointerMove updates the active thumb once dragging', () => {
		const { api, setRange } = setup({ current: [20, 80] })

		api.onPointerDown(makeEvent({ clientX: 30 }))

		setRange.mockClear()

		api.onPointerMove(makeEvent({ clientX: 60 }))

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		expect(updater([30, 80])).toEqual([60, 80])
	})

	it('onPointerUp clears the drag so subsequent moves are ignored', () => {
		const { api, setRange } = setup({ current: [20, 80] })

		api.onPointerDown(makeEvent({ clientX: 30 }))

		api.onPointerUp()

		setRange.mockClear()

		api.onPointerMove(makeEvent({ clientX: 60 }))

		expect(setRange).not.toHaveBeenCalled()
	})

	it('onPointerCancel clears the drag so subsequent moves are ignored', () => {
		const { api, setRange } = setup({ current: [20, 80] })

		api.onPointerDown(makeEvent({ clientX: 30 }))

		api.onPointerCancel()

		setRange.mockClear()

		api.onPointerMove(makeEvent({ clientX: 60 }))

		expect(setRange).not.toHaveBeenCalled()
	})

	it('onLostPointerCapture clears the drag so subsequent moves are ignored', () => {
		const { api, setRange } = setup({ current: [20, 80] })

		api.onPointerDown(makeEvent({ clientX: 30 }))

		api.onLostPointerCapture()

		setRange.mockClear()

		api.onPointerMove(makeEvent({ clientX: 60 }))

		expect(setRange).not.toHaveBeenCalled()
	})

	it('clamps the pointer value when dragging past the track edges', () => {
		const { api, setRange } = setup({ current: [20, 80] })

		api.onPointerDown(makeEvent({ clientX: -50 }))

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		expect(updater([20, 80])).toEqual([0, 80])
	})

	it('moves the lower thumb when stacked and the pointer lands below the stack', () => {
		const { api, setRange } = setup({ current: [50, 50] })

		api.onPointerDown(makeEvent({ clientX: 20 }))

		expect(setRange).toHaveBeenCalled()

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		expect(updater([50, 50])[0]).toBe(20)
	})

	it('moves the upper thumb when stacked and the pointer lands above the stack', () => {
		const { api, setRange } = setup({ current: [50, 50] })

		api.onPointerDown(makeEvent({ clientX: 90 }))

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		expect(updater([50, 50])[1]).toBe(90)
	})

	it('defers thumb selection until the first move reveals direction', () => {
		const { api, setRange } = setup({ current: [50, 50] })

		api.onPointerDown(makeEvent({ clientX: 50 }))

		expect(setRange).not.toHaveBeenCalled()

		api.onPointerMove(makeEvent({ clientX: 60 }))

		expect(setRange).toHaveBeenCalled()
	})

	it('moves focus to the lower thumb when the first move resolves to it', () => {
		const { api, thumbs } = setup({ current: [50, 50] })

		api.onPointerDown(makeEvent({ clientX: 50 }))

		api.onPointerMove(makeEvent({ clientX: 40 }))

		expect(document.activeElement).toBe(thumbs[0])
	})

	it('stays pending when stacked at min and pointer moves left', () => {
		const { api, setRange } = setup({ current: [0, 0] })

		api.onPointerDown(makeEvent({ clientX: 0 }))

		api.onPointerMove(makeEvent({ clientX: -10 }))

		expect(setRange).not.toHaveBeenCalled()
	})

	it('stays pending when stacked at max and pointer moves right', () => {
		const { api, setRange } = setup({ current: [100, 100] })

		api.onPointerDown(makeEvent({ clientX: 100 }))

		api.onPointerMove(makeEvent({ clientX: 110 }))

		expect(setRange).not.toHaveBeenCalled()
	})

	it('reassigns the dragging thumb when overlap is swap and thumbs cross', () => {
		const { api, setRange } = setup({ current: [20, 30], overlap: 'swap' })

		api.onPointerDown(makeEvent({ clientX: 20 }))

		setRange.mockClear()

		api.onPointerMove(makeEvent({ clientX: 90 }))

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		// Thumb 0 dragged to 90 crosses thumb 1 (30); swap re-sorts to [30, 90].
		expect(updater([20, 30])).toEqual([30, 90])
	})

	it('reassigns the upper thumb to slot 0 when it crosses below the lower in swap mode', () => {
		const { api, setRange } = setup({ current: [70, 80], overlap: 'swap' })

		// Pointer near 80 → closer to upper thumb (index 1).
		api.onPointerDown(makeEvent({ clientX: 80 }))

		setRange.mockClear()

		// Drag the upper thumb past the lower one: swap re-points draggingRef
		// at index 0 so subsequent moves track the same finger.
		api.onPointerMove(makeEvent({ clientX: 10 }))

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		// Thumb 1 dragged to 10 crosses thumb 0 (70); swap re-sorts to [10, 70].
		expect(updater([70, 80])).toEqual([10, 70])
	})

	it('falls back to min when the track ref is detached', () => {
		const setRange = vi.fn()

		const { result } = renderHook(() =>
			useRangePointer({
				min: 5,
				max: 100,
				step: 1,
				disabled: false,
				current: [20, 80],
				trackRef: { current: null },
				setRange,
				overlap: 'clamp',
				thumbRefs: makeThumbs().refs,
			}),
		)

		result.current.onPointerDown(makeEvent({ clientX: 50 }))

		const updater = setRange.mock.calls[0]?.[0] as (
			prev: [number, number] | undefined,
		) => [number, number]

		// valueFromPointer returns min=5; closest thumb to value=5 is index 0.
		expect(updater([20, 80])[0]).toBe(5)
	})

	it('stays pending when stacked and pointer has not moved', () => {
		const { api, setRange } = setup({ current: [50, 50] })

		api.onPointerDown(makeEvent({ clientX: 50 }))

		// dx === 0 case: pointermove at the same x.
		api.onPointerMove(makeEvent({ clientX: 50 }))

		expect(setRange).not.toHaveBeenCalled()
	})
})
