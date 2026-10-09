import { renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ThumbButtonRefs, ThumbIndex } from '../../components/slider/range/types'
import { useRangePointer } from '../../components/slider/range/use-range-pointer'
import { attach, makePointerEvent } from '../helpers'

function makeTrack() {
	const el = document.createElement('div')

	el.getBoundingClientRect = () => DOMRect.fromRect({ width: 100, height: 10 })

	return el
}

// The buttons attach to the document: a detached node takes no focus, so an
// assertion against `activeElement` would pass for the wrong reason.
function makeThumbs(): { refs: ThumbButtonRefs; buttons: [HTMLButtonElement, HTMLButtonElement] } {
	const lo = attach(document.createElement('button'))

	const hi = attach(document.createElement('button'))

	return { refs: [{ current: lo }, { current: hi }], buttons: [lo, hi] }
}

function makeEvent(overrides: Partial<ReactPointerEvent> = {}): ReactPointerEvent {
	const target = document.createElement('div')

	vi.spyOn(target, 'setPointerCapture')

	return makePointerEvent({ currentTarget: target, ...overrides })
}

function setup(
	options: {
		disabled?: boolean
		current?: [number, number]
		overlap?: 'clamp' | 'swap'
		bounds?: { min: number; max: number; step: number }
	} = {},
) {
	const track = makeTrack()

	const { refs, buttons } = makeThumbs()

	const setRange = vi.fn()

	const onDragStart = vi.fn()

	const onDragEnd = vi.fn()

	const { result } = renderHook(() =>
		useRangePointer({
			min: 0,
			max: 100,
			step: 1,
			...options.bounds,
			disabled: options.disabled ?? false,
			current: options.current ?? [20, 80],
			trackRef: { current: track },
			setRange,
			overlap: options.overlap ?? 'clamp',
			thumbRefs: refs,
			onDragStart,
			onDragEnd,
		}),
	)

	return { api: result.current, setRange, thumbs: buttons, onDragStart, onDragEnd }
}

/** The range the first `setRange` call gives when it applies to `prev`. */
function firstUpdate(setRange: ReturnType<typeof vi.fn>, prev: [number, number]) {
	const updater = setRange.mock.calls[0]?.[0] as
		| ((prev: [number, number] | undefined) => [number, number])
		| undefined

	if (!updater) throw new Error('setRange was not called')

	return updater(prev)
}

describe('useRangePointer', () => {
	// clientX maps straight to a value on the 0-100 track. The press moves the
	// thumb nearest to that value, and clamps a press past an edge.
	it.each<[string, [number, number], number, [number, number]]>([
		['moves the nearest thumb to the pointer position', [20, 80], 30, [30, 80]],
		['picks the upper thumb when the pointer is closer to it', [20, 80], 70, [20, 70]],
		['clamps the pointer value past the track edges', [20, 80], -50, [0, 80]],
		['moves the lower thumb when the pointer lands below a stack', [50, 50], 20, [20, 50]],
		['moves the upper thumb when the pointer lands above a stack', [50, 50], 90, [50, 90]],
	])('onPointerDown %s', (_name, current, clientX, expected) => {
		const { api, setRange } = setup({ current })

		api.onPointerDown(makeEvent({ clientX }))

		expect(firstUpdate(setRange, current)).toEqual(expected)
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
		['on a macOS Ctrl-click', {}, { ctrlKey: true }],
		['on a pointer that is not primary', {}, { isPrimary: false }],
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

		expect(firstUpdate(setRange, [30, 80])).toEqual([60, 80])
	})

	it.each<[string, (api: ReturnType<typeof setup>['api']) => void]>([
		['onPointerUp', (api) => api.onPointerUp()],
		['onPointerCancel', (api) => api.onPointerCancel()],
		['onLostPointerCapture', (api) => api.onLostPointerCapture()],
	])('%s clears the drag so subsequent moves are ignored', (_name, end) => {
		const { api, setRange } = setup({ current: [20, 80] })

		api.onPointerDown(makeEvent({ clientX: 30 }))

		end(api)

		setRange.mockClear()

		api.onPointerMove(makeEvent({ clientX: 60 }))

		expect(setRange).not.toHaveBeenCalled()
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

	it.each<[string, [number, number], number, number]>([
		['stacked at min and the pointer moves left', [0, 0], 0, -10],
		['stacked at max and the pointer moves right', [100, 100], 100, 110],
		// dx === 0: pointermove at the same x.
		['stacked and the pointer has not moved', [50, 50], 50, 50],
	])('stays pending when %s', (_name, current, downX, moveX) => {
		const { api, setRange } = setup({ current })

		api.onPointerDown(makeEvent({ clientX: downX }))

		api.onPointerMove(makeEvent({ clientX: moveX }))

		expect(setRange).not.toHaveBeenCalled()
	})

	it('reassigns the dragging thumb when overlap is swap and thumbs cross', () => {
		const { api, setRange } = setup({ current: [20, 30], overlap: 'swap' })

		api.onPointerDown(makeEvent({ clientX: 20 }))

		setRange.mockClear()

		api.onPointerMove(makeEvent({ clientX: 90 }))

		// Thumb 0 dragged to 90 crosses thumb 1 (30); swap re-sorts to [30, 90].
		expect(firstUpdate(setRange, [20, 30])).toEqual([30, 90])
	})

	it.each<[string, [number, number], number, number, ThumbIndex]>([
		['the lower thumb crosses above the upper', [20, 30], 20, 90, 1],
		['the upper thumb crosses below the lower', [70, 80], 80, 10, 0],
	])(
		'moves focus with the dragged value when %s in swap mode',
		(_, current, downX, moveX, slot) => {
			const { api, thumbs } = setup({ current, overlap: 'swap' })

			api.onPointerDown(makeEvent({ clientX: downX }))

			expect(document.activeElement).toBe(thumbs[slot === 0 ? 1 : 0])

			api.onPointerMove(makeEvent({ clientX: moveX }))

			// The value now sits in the other slot, so an arrow key must drive it there.
			expect(document.activeElement).toBe(thumbs[slot])
		},
	)

	it('reassigns the upper thumb to slot 0 when it crosses below the lower in swap mode', () => {
		const { api, setRange } = setup({ current: [70, 80], overlap: 'swap' })

		// Pointer near 80 → closer to upper thumb (index 1).
		api.onPointerDown(makeEvent({ clientX: 80 }))

		setRange.mockClear()

		// Drag the upper thumb past the lower one: swap re-points draggingRef
		// at index 0 so subsequent moves track the same finger.
		api.onPointerMove(makeEvent({ clientX: 10 }))

		// Thumb 1 dragged to 10 crosses thumb 0 (70); swap re-sorts to [10, 70].
		expect(firstUpdate(setRange, [70, 80])).toEqual([10, 70])
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

		// valueFromPointer returns min=5; closest thumb to value=5 is index 0.
		expect(firstUpdate(setRange, [20, 80])[0]).toBe(5)
	})

	// With min 2, max 10, and step 3, the step grid holds 11, past max. A value
	// snaps to the grid and then clamps, as `update` writes it, so a press near
	// max lands on 10 and not on 11.
	describe('a step grid that ends past max', () => {
		const bounds = { min: 2, max: 10, step: 3 }

		// clientX 95 on the 100px track is the raw value 9.6, which snaps to 11.
		it('defers a press near max on thumbs stacked at max', () => {
			const { api, setRange, thumbs } = setup({ bounds, current: [10, 10] })

			api.onPointerDown(makeEvent({ clientX: 95 }))

			expect(setRange).not.toHaveBeenCalled()

			expect(document.activeElement).toBe(thumbs[1])
		})

		it('drags the lower thumb off a stack at max when the pointer moves down', () => {
			const { api, setRange } = setup({ bounds, current: [10, 10] })

			api.onPointerDown(makeEvent({ clientX: 95 }))

			api.onPointerMove(makeEvent({ clientX: 50 }))

			expect(firstUpdate(setRange, [10, 10])).toEqual([5, 10])
		})

		it('keeps the focus on a swap-mode drag that reaches max without a cross', () => {
			const { api, thumbs } = setup({ bounds, current: [2, 10], overlap: 'swap' })

			api.onPointerDown(makeEvent({ clientX: 0 }))

			api.onPointerMove(makeEvent({ clientX: 95 }))

			expect(document.activeElement).toBe(thumbs[0])
		})
	})

	describe('the drag bracket', () => {
		it.each<[string, [number, number], number, ThumbIndex]>([
			['the nearest thumb', [20, 80], 30, 0],
			['the upper thumb when the pointer is closer to it', [20, 80], 70, 1],
			['the lower thumb when the pointer lands below a stack', [50, 50], 20, 0],
			['the upper thumb when the pointer lands above a stack', [50, 50], 90, 1],
		])('onPointerDown starts the drag on %s', (_name, current, clientX, thumb) => {
			const { api, onDragStart, onDragEnd } = setup({ current })

			api.onPointerDown(makeEvent({ clientX }))

			expect(onDragStart).toHaveBeenCalledExactlyOnceWith(thumb)

			expect(onDragEnd).not.toHaveBeenCalled()
		})

		it.each<[string, (api: ReturnType<typeof setup>['api']) => void]>([
			['onPointerUp', (api) => api.onPointerUp()],
			['onPointerCancel', (api) => api.onPointerCancel()],
			['onLostPointerCapture', (api) => api.onLostPointerCapture()],
		])('%s ends the drag on the grabbed thumb', (_name, end) => {
			const { api, onDragStart, onDragEnd } = setup({ current: [20, 80] })

			api.onPointerDown(makeEvent({ clientX: 70 }))

			end(api)

			expect(onDragStart).toHaveBeenCalledExactlyOnceWith(1)

			expect(onDragEnd).toHaveBeenCalledExactlyOnceWith(1)
		})

		// A press on the stack grabs no thumb: the direction is still unknown, and
		// nothing has moved. A release from there closes a bracket that never opened.
		it('says nothing for a press on a stack that never moves', () => {
			const { api, onDragStart, onDragEnd } = setup({ current: [50, 50] })

			api.onPointerDown(makeEvent({ clientX: 50 }))

			expect(onDragStart).not.toHaveBeenCalled()

			api.onPointerUp()

			expect(onDragEnd).not.toHaveBeenCalled()
		})

		it('starts the drag on the thumb the first move resolves after a stacked press', () => {
			const { api, onDragStart } = setup({ current: [50, 50] })

			api.onPointerDown(makeEvent({ clientX: 50 }))

			api.onPointerMove(makeEvent({ clientX: 20 }))

			expect(onDragStart).toHaveBeenCalledExactlyOnceWith(0)
		})

		it('starts once across a whole drag, however many moves it takes', () => {
			const { api, onDragStart } = setup({ current: [20, 80] })

			api.onPointerDown(makeEvent({ clientX: 30 }))

			api.onPointerMove(makeEvent({ clientX: 40 }))

			api.onPointerMove(makeEvent({ clientX: 50 }))

			expect(onDragStart).toHaveBeenCalledExactlyOnceWith(0)
		})

		// Under `swap` the dragged value crosses into the other slot, and
		// `draggingRef` follows it. The bracket must not: a start on 0 that ended on
		// 1 would leave a consumer's per-thumb flag raised for good.
		it('reports the grabbed thumb at both ends of a swap', () => {
			const { api, onDragStart, onDragEnd } = setup({ current: [20, 80], overlap: 'swap' })

			api.onPointerDown(makeEvent({ clientX: 30 }))

			api.onPointerMove(makeEvent({ clientX: 90 }))

			api.onPointerUp()

			expect(onDragStart).toHaveBeenCalledExactlyOnceWith(0)

			expect(onDragEnd).toHaveBeenCalledExactlyOnceWith(0)
		})

		it.each<[string, { disabled?: boolean }, Partial<ReactPointerEvent>]>([
			['when disabled', { disabled: true }, {}],
			['on a non-primary press', {}, { button: 2 }],
			['on a macOS Ctrl-click', {}, { ctrlKey: true }],
		])('says nothing %s', (_name, options, overrides) => {
			const { api, onDragStart, onDragEnd } = setup(options)

			api.onPointerDown(makeEvent({ clientX: 30, ...overrides }))

			api.onPointerUp()

			expect(onDragStart).not.toHaveBeenCalled()

			expect(onDragEnd).not.toHaveBeenCalled()
		})
	})
})
