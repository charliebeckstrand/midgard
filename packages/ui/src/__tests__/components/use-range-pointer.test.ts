import { renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useRangePointer } from '../../components/slider/range/use-range-pointer'

function makeTrack() {
	const el = document.createElement('div')

	el.getBoundingClientRect = () =>
		({ x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 10, width: 100, height: 10 }) as DOMRect

	return el
}

function makeEvent(overrides: Partial<ReactPointerEvent> = {}) {
	const target = { setPointerCapture: vi.fn() }

	return {
		clientX: 0,
		pointerId: 1,
		currentTarget: target,
		preventDefault: vi.fn(),
		...overrides,
	} as unknown as ReactPointerEvent
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

		expect(
			(event.currentTarget as unknown as { setPointerCapture: ReturnType<typeof vi.fn> })
				.setPointerCapture,
		).toHaveBeenCalledWith(1)
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
})
