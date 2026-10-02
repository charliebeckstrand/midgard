import { act, renderHook } from '@testing-library/react'
import { createRef, type RefObject } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PanelConfig } from '../../components/resizable/types'
import { useResizablePanel } from '../../components/resizable/use-resizable-panel'
import { makePointerEvent } from '../helpers'

// The drag path coalesces pointermove commits into one animation frame, so tests
// drive a controllable rAF queue and flush it to observe the committed sizes.
let frameQueue: FrameRequestCallback[] = []

function flushFrames(): void {
	const pending = frameQueue

	frameQueue = []

	for (const cb of pending) cb(0)
}

function makeGroup(
	rect: { width: number; height: number },
	handleCount = 0,
	handleRect: { width?: number; height?: number } = {},
): HTMLDivElement {
	const el = document.createElement('div')

	for (let i = 0; i < handleCount; i++) {
		const handle = document.createElement('div')

		handle.setAttribute('data-slot', 'resizable-handle')

		Object.defineProperty(handle, 'getBoundingClientRect', {
			value: () => DOMRect.fromRect(handleRect),
		})

		el.appendChild(handle)
	}

	Object.defineProperty(el, 'getBoundingClientRect', {
		value: () => DOMRect.fromRect({ width: rect.width, height: rect.height }),
	})

	return el
}

function makeRef(el: HTMLDivElement | null): RefObject<HTMLDivElement | null> {
	const ref = createRef<HTMLDivElement | null>()

	;(ref as { current: HTMLDivElement | null }).current = el

	return ref
}

/**
 * A pointerdown on a handle node. `startDrag` captures the pointer on
 * `currentTarget`, so each event carries a node with a capture spy.
 */
function handleDown(overrides: Parameters<typeof makePointerEvent>[0] = {}) {
	const handle = document.createElement('div')

	vi.spyOn(handle, 'setPointerCapture')

	return makePointerEvent({ currentTarget: handle, ...overrides })
}

/** Panels with the given default sizes and no bounds, keyed by position. */
function panels(...defaultSizes: number[]): PanelConfig[] {
	return defaultSizes.map((defaultSize, index) => ({
		key: `.${index}`,
		defaultSize,
		minSize: 0,
		maxSize: 100,
	}))
}

const equalPanels = panels(1, 1)

type PanelOptions = Parameters<typeof useResizablePanel>[0]

/** Renders the hook over two equal panels in a detached horizontal group, with `overrides` on top. */
function renderPanel(overrides: Partial<PanelOptions> = {}) {
	return renderHook(() =>
		useResizablePanel({
			groupRef: makeRef(null),
			orientation: 'horizontal',
			panelConfigs: equalPanels,
			...overrides,
		}),
	)
}

/** A 1000 × 100 horizontal group, wide enough for a drag to start. */
const wideGroup = () => makeRef(makeGroup({ width: 1000, height: 100 }))

describe('useResizablePanel', () => {
	beforeEach(() => {
		frameQueue = []

		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			frameQueue.push(cb)

			return frameQueue.length
		})

		vi.stubGlobal('cancelAnimationFrame', () => {})
	})

	describe('initial sizes', () => {
		it.each<[string, PanelConfig[], number[]]>([
			['normalizes defaultSizes to sum to 100', equalPanels, [50, 50]],
			['preserves sizes when defaults already sum to 100', panels(30, 70), [30, 70]],
			['handles a three-panel configuration', panels(1, 2, 1), [25, 50, 25]],
			// `defaultSize` is a weight, not a percentage (B08-C08, B08-Q2).
			['reads defaultSizes as weights', panels(30, 50), [37.5, 62.5]],
			// Seeding clamps each panel into its bounds, and the neighbor takes the
			// difference (B08-C09, B08-Q3).
			[
				'raises a panel to its minSize',
				[
					{ key: '.0', defaultSize: 10, minSize: 30, maxSize: 100 },
					{ key: '.1', defaultSize: 90, minSize: 0, maxSize: 100 },
				],
				[30, 70],
			],
			[
				'lowers a panel to its maxSize',
				[
					{ key: '.0', defaultSize: 90, minSize: 0, maxSize: 60 },
					{ key: '.1', defaultSize: 10, minSize: 0, maxSize: 100 },
				],
				[60, 40],
			],
			[
				'raises the last panel and takes the difference from its neighbor',
				[
					{ key: '.0', defaultSize: 25, minSize: 0, maxSize: 100 },
					{ key: '.1', defaultSize: 50, minSize: 0, maxSize: 100 },
					{ key: '.2', defaultSize: 25, minSize: 40, maxSize: 100 },
				],
				[25, 35, 40],
			],
		])('%s', (_name, panelConfigs, expected) => {
			const { result } = renderPanel({ panelConfigs })

			expect(result.current.sizes).toEqual(expected)
		})

		it('clamps the sizes again when the panel set changes', () => {
			const { result, rerender } = renderHook(
				({ panelConfigs }: { panelConfigs: PanelConfig[] }) =>
					useResizablePanel({ groupRef: makeRef(null), orientation: 'horizontal', panelConfigs }),
				{ initialProps: { panelConfigs: equalPanels } },
			)

			rerender({
				panelConfigs: [
					{ key: '.0', defaultSize: 10, minSize: 30, maxSize: 100 },
					{ key: '.$other', defaultSize: 90, minSize: 0, maxSize: 100 },
				],
			})

			expect(result.current.sizes).toEqual([30, 70])
		})
	})

	describe('panel set changes', () => {
		function renderPanelSet(initial: PanelConfig[]) {
			return renderHook(
				({ panelConfigs }: { panelConfigs: PanelConfig[] }) =>
					useResizablePanel({ groupRef: makeRef(null), orientation: 'horizontal', panelConfigs }),
				{ initialProps: { panelConfigs: initial } },
			)
		}

		it('re-derives sizes when a panel is added', () => {
			const { result, rerender } = renderPanelSet(equalPanels)

			expect(result.current.sizes).toEqual([50, 50])

			rerender({ panelConfigs: panels(1, 1, 1) })

			// Stale [50, 50] would leave the third panel un-normalized; resync
			// re-normalizes across the new set.
			expect(result.current.sizes).toHaveLength(3)

			for (const s of result.current.sizes) expect(s).toBeCloseTo(33.333, 2)
		})

		it('re-derives sizes when a panel is removed', () => {
			const { result, rerender } = renderPanelSet(panels(1, 1, 1))

			rerender({ panelConfigs: equalPanels })

			expect(result.current.sizes).toEqual([50, 50])
		})

		it('re-derives sizes when a panel is replaced at the same count', () => {
			const { result, rerender } = renderPanelSet(equalPanels)

			act(() => result.current.resize(0, 20))

			expect(result.current.sizes).toEqual([70, 30])

			rerender({
				panelConfigs: [
					{ key: '.0', defaultSize: 1, minSize: 0, maxSize: 100 },
					{ key: '.$other', defaultSize: 3, minSize: 0, maxSize: 100 },
				],
			})

			expect(result.current.sizes).toEqual([25, 75])
		})

		it('keeps dragged sizes while the panel set holds', () => {
			const { result, rerender } = renderPanelSet(equalPanels)

			act(() => result.current.resize(0, 20))

			rerender({ panelConfigs: equalPanels.map((config) => ({ ...config })) })

			expect(result.current.sizes).toEqual([70, 30])
		})
	})

	describe('resize (keyboard-style nudge)', () => {
		it('shifts size from the right panel to the left panel', () => {
			const onSizesChange = vi.fn()

			const { result } = renderPanel({ onSizesChange })

			act(() => result.current.resize(0, 10))

			expect(result.current.sizes).toEqual([60, 40])

			expect(onSizesChange).toHaveBeenCalledWith([60, 40])
		})

		it.each<[string, PanelConfig[], number, number[]]>([
			// A huge nudge: right clamps to its min (10); left clamps to its own
			// max of 60 rather than taking the remainder (90).
			[
				'respects the left panel maxSize even when derived from the clamped right',
				[
					{ key: '.0', defaultSize: 1, minSize: 0, maxSize: 60 },
					{ key: '.1', defaultSize: 1, minSize: 10, maxSize: 100 },
				],
				90,
				[60, 40],
			],
			[
				'clamps to the right panel maxSize',
				[
					{ key: '.0', defaultSize: 1, minSize: 0, maxSize: 80 },
					{ key: '.1', defaultSize: 1, minSize: 20, maxSize: 100 },
				],
				90,
				[80, 20],
			],
			[
				'clamps to the left panel minSize',
				[
					{ key: '.0', defaultSize: 1, minSize: 20, maxSize: 100 },
					{ key: '.1', defaultSize: 1, minSize: 0, maxSize: 100 },
				],
				-90,
				[20, 80],
			],
			// The two minimums sum past 100, so no split holds both. The left panel
			// keeps its own bounds, and the right panel takes the remainder.
			[
				'keeps the left panel bounds when the pair is over-constrained',
				[
					{ key: '.0', defaultSize: 1, minSize: 40, maxSize: 100 },
					{ key: '.1', defaultSize: 1, minSize: 70, maxSize: 100 },
				],
				-30,
				[40, 60],
			],
		])('%s', (_name, panelConfigs, delta, expected) => {
			const { result } = renderPanel({ panelConfigs })

			act(() => result.current.resize(0, delta))

			expect(result.current.sizes).toEqual(expected)
		})

		it('preserves total size after resize', () => {
			const { result } = renderPanel()

			act(() => result.current.resize(0, 17))

			const total = result.current.sizes.reduce((sum, s) => sum + s, 0)

			expect(total).toBeCloseTo(100, 5)
		})

		it('does nothing when handleIndex is out of range', () => {
			const onSizesChange = vi.fn()

			const { result } = renderPanel({ onSizesChange })

			act(() => result.current.resize(5, 10))

			expect(result.current.sizes).toEqual([50, 50])

			expect(onSizesChange).not.toHaveBeenCalled()
		})

		it('resizes the correct pair when there are more than two panels', () => {
			const { result } = renderPanel({ panelConfigs: panels(1, 1, 1) })

			act(() => result.current.resize(1, 10))

			const [a, b, c] = result.current.sizes

			expect(a).toBeCloseTo(33.333, 2)

			expect(b).toBeCloseTo(43.333, 2)

			expect(c).toBeCloseTo(23.333, 2)
		})
	})

	describe('dragging state', () => {
		it('exposes dragging=null initially', () => {
			const { result } = renderPanel()

			expect(result.current.dragging).toBeNull()
		})

		it.each<[string, () => RefObject<HTMLDivElement | null>, number]>([
			['when groupRef is null', () => makeRef(null), 0],
			['for a non-primary button', wideGroup, 2],
			[
				'when the available size collapses to zero',
				() => makeRef(makeGroup({ width: 0, height: 0 })),
				0,
			],
		])('ignores startDrag %s', (_name, groupRef, button) => {
			const { result } = renderPanel({ groupRef: groupRef() })

			const event = handleDown({ button, clientX: 0, clientY: 0 })

			act(() => {
				result.current.startDrag(0, event)
			})

			expect(result.current.dragging).toBeNull()

			expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled()
		})

		it('sets dragging=handleIndex on a valid startDrag and clears on pointerup', () => {
			const { result } = renderPanel({ groupRef: wideGroup() })

			const preventDefault = vi.fn()

			act(() => {
				result.current.startDrag(
					0,
					handleDown({ button: 0, clientX: 100, clientY: 0, preventDefault }),
				)
			})

			expect(preventDefault).toHaveBeenCalled()

			expect(result.current.dragging).toBe(0)

			act(() => {
				document.dispatchEvent(new Event('pointerup'))
			})

			expect(result.current.dragging).toBeNull()
		})

		it('captures the pointer on the handle when a drag starts', () => {
			const { result } = renderPanel({ groupRef: wideGroup() })

			const event = handleDown({ button: 0, clientX: 100, clientY: 0 })

			act(() => {
				result.current.startDrag(0, event)
			})

			expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(1)
		})
	})

	describe('drag commits sizes via pointermove', () => {
		it('updates sizes proportionally to pointer delta along the active axis', () => {
			const onSizesChange = vi.fn()

			const { result } = renderPanel({ groupRef: wideGroup(), onSizesChange })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 600, clientY: 0 }))

				flushFrames()
			})

			// 100px delta / 1000px available = 10% shift.
			expect(result.current.sizes).toEqual([60, 40])

			expect(onSizesChange).toHaveBeenLastCalledWith([60, 40])
		})

		it('uses clientY when orientation is vertical', () => {
			const { result } = renderPanel({
				groupRef: makeRef(makeGroup({ width: 100, height: 1000 })),
				orientation: 'vertical',
			})

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 0, clientY: 500 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 700 }))

				flushFrames()
			})

			expect(result.current.sizes).toEqual([70, 30])
		})

		it('subtracts the handle heights from the available size of a vertical group', () => {
			const group = makeGroup({ width: 100, height: 1000 }, 1, { width: 100, height: 200 })

			const { result } = renderPanel({ groupRef: makeRef(group), orientation: 'vertical' })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 0, clientY: 500 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 580 }))

				flushFrames()
			})

			// 80px delta / (1000px - 200px of handle) = 10% shift.
			expect(result.current.sizes).toEqual([60, 40])
		})

		it('commits a burst of moves once per frame, at the last position', () => {
			const onSizesChange = vi.fn()

			const { result } = renderPanel({ groupRef: wideGroup(), onSizesChange })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 600, clientY: 0 }))

				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 700, clientY: 0 }))
			})

			// The second move reuses the frame that the first move requested.
			expect(frameQueue).toHaveLength(1)

			act(() => flushFrames())

			expect(result.current.sizes).toEqual([70, 30])

			expect(onSizesChange).toHaveBeenCalledExactlyOnceWith([70, 30])
		})

		it('commits the last move at once when the pointer lifts before the frame', () => {
			const cancelAnimationFrame = vi.fn()

			vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)

			const onSizesChange = vi.fn()
			const onResizeEnd = vi.fn()

			const { result } = renderPanel({ groupRef: wideGroup(), onSizesChange, onResizeEnd })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 600, clientY: 0 }))

				document.dispatchEvent(new PointerEvent('pointerup'))
			})

			expect(cancelAnimationFrame).toHaveBeenCalledWith(1)

			expect(result.current.sizes).toEqual([60, 40])

			// The sizes settle before the end of the bracket.
			expect(onSizesChange).toHaveBeenCalledExactlyOnceWith([60, 40])

			expect(onSizesChange.mock.invocationCallOrder[0]).toBeLessThan(
				onResizeEnd.mock.invocationCallOrder[0] ?? 0,
			)
		})

		it.each(['pointerup', 'pointercancel'])('stops updating after %s', (type) => {
			const { result } = renderPanel({ groupRef: wideGroup() })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			act(() => {
				document.dispatchEvent(new Event(type))
			})

			expect(result.current.dragging).toBeNull()

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 900, clientY: 0 }))
			})

			expect(result.current.sizes).toEqual([50, 50])
		})
	})

	describe('degenerate configurations', () => {
		it('preserves panel defaults when their sum is zero', () => {
			const { result } = renderPanel({ panelConfigs: panels(0, 0) })

			// total=0 → the normalization branch returns `raw` untouched.
			expect(result.current.sizes).toEqual([0, 0])
		})

		it('skips contextmenu cleanup gracefully when no drag is active', () => {
			renderPanel()

			expect(() => document.dispatchEvent(new Event('contextmenu'))).not.toThrow()
		})

		it('clears the drag on contextmenu while a drag is in progress', () => {
			const { result } = renderPanel({ groupRef: wideGroup() })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			expect(result.current.dragging).toBe(0)

			act(() => {
				document.dispatchEvent(new Event('contextmenu'))
			})

			expect(result.current.dragging).toBeNull()
		})
	})

	describe('drag bracket', () => {
		it('brackets a pointer drag, reporting the handle index on each end', () => {
			const onResizeStart = vi.fn()
			const onResizeEnd = vi.fn()

			const { result } = renderPanel({ groupRef: wideGroup(), onResizeStart, onResizeEnd })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			expect(onResizeStart).toHaveBeenCalledExactlyOnceWith(0)

			expect(onResizeEnd).not.toHaveBeenCalled()

			act(() => {
				document.dispatchEvent(new PointerEvent('pointerup'))
			})

			expect(onResizeEnd).toHaveBeenCalledExactlyOnceWith(0)
		})

		it('reports the end once when a canceled pointer also fires pointerup', () => {
			const onResizeEnd = vi.fn()

			const { result } = renderPanel({ groupRef: wideGroup(), onResizeEnd })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointercancel'))

				document.dispatchEvent(new PointerEvent('pointerup'))
			})

			expect(onResizeEnd).toHaveBeenCalledExactlyOnceWith(0)
		})

		it('closes the first bracket when a second pointer supersedes the drag', () => {
			const onResizeStart = vi.fn()
			const onResizeEnd = vi.fn()

			const { result } = renderPanel({
				groupRef: wideGroup(),
				panelConfigs: panels(1, 1, 1),
				onResizeStart,
				onResizeEnd,
			})

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 300, clientY: 0 }))
			})

			// A second handle grabbed before the first lifts. The superseded drag is over,
			// so its bracket closes rather than dangling.
			act(() => {
				result.current.startDrag(1, handleDown({ button: 0, clientX: 600, clientY: 0 }))
			})

			expect(onResizeEnd).toHaveBeenCalledExactlyOnceWith(0)

			expect(onResizeStart.mock.calls).toEqual([[0], [1]])
		})

		it('closes the bracket when the group unmounts mid-drag', () => {
			const onResizeEnd = vi.fn()

			const { result, unmount } = renderPanel({ groupRef: wideGroup(), onResizeEnd })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			unmount()

			expect(onResizeEnd).toHaveBeenCalledExactlyOnceWith(0)
		})

		it('stays silent for a keyboard nudge, which has no drag lifecycle', () => {
			const onResizeStart = vi.fn()
			const onResizeEnd = vi.fn()
			const onSizesChange = vi.fn()

			const { result } = renderPanel({
				groupRef: wideGroup(),
				onSizesChange,
				onResizeStart,
				onResizeEnd,
			})

			act(() => {
				result.current.resize(0, 10)
			})

			expect(onSizesChange).toHaveBeenCalledOnce()

			expect(onResizeStart).not.toHaveBeenCalled()

			expect(onResizeEnd).not.toHaveBeenCalled()
		})
	})

	describe('unmount cleanup', () => {
		it('removes document listeners on unmount mid-drag', () => {
			const onSizesChange = vi.fn()

			const { result, unmount } = renderPanel({ groupRef: wideGroup(), onSizesChange })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			onSizesChange.mockClear()

			unmount()

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 900 }))
			})

			expect(onSizesChange).not.toHaveBeenCalled()
		})

		it('cancels the pending frame on unmount mid-drag', () => {
			const cancelAnimationFrame = vi.fn()

			vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)

			const { result, unmount } = renderPanel({ groupRef: wideGroup() })

			act(() => {
				result.current.startDrag(0, handleDown({ button: 0, clientX: 500, clientY: 0 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 600, clientY: 0 }))
			})

			unmount()

			// Without the cancel, the frame commits sizes to an unmounted hook.
			expect(cancelAnimationFrame).toHaveBeenCalledExactlyOnceWith(1)
		})
	})
})
