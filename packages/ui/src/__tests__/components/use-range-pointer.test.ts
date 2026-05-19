import { renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useRangePointer } from '../../components/slider/range/use-range-pointer'
import { makePointerEvent } from '../helpers'

function makeTrack() {
	const el = document.createElement('div')

	el.getBoundingClientRect = () => DOMRect.fromRect({ width: 100, height: 10 })

	return el
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
		}),
	)

	return { api: result.current, track, setRange }
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

		// clientX=30 on a 0–100 track maps to value 30 — closer to thumb 0 (20) than thumb 1 (80).
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

	it('onPointerDown captures the pointer on the target', () => {
		const { api } = setup()

		const event = makeEvent({ clientX: 30 })

		api.onPointerDown(event)

		expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(1)
	})

	it('onPointerDown is a no-op when disabled', () => {
		const { api, setRange } = setup({ disabled: true })

		const event = makeEvent({ clientX: 30 })

		api.onPointerDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(setRange).not.toHaveBeenCalled()
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

		expect(setRange).toHaveBeenCalled()
	})

	it('reassigns the upper thumb to slot 0 when it crosses below the lower in swap mode', () => {
		const { api, setRange } = setup({ current: [70, 80], overlap: 'swap' })

		// Pointer near 80 → closer to upper thumb (index 1).
		api.onPointerDown(makeEvent({ clientX: 80 }))

		setRange.mockClear()

		// Drag the upper thumb past the lower one — swap re-points draggingRef
		// at index 0 so subsequent moves track the same finger.
		api.onPointerMove(makeEvent({ clientX: 10 }))

		expect(setRange).toHaveBeenCalled()
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
