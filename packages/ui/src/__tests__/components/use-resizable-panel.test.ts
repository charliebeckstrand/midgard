import { act, renderHook } from '@testing-library/react'
import { createRef, type RefObject } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PanelConfig } from '../../components/resizable/types'
import { useResizablePanel } from '../../components/resizable/use-resizable-panel'
import { makePointerEvent } from '../helpers'

function makeGroup(rect: { width: number; height: number }, handleCount = 0): HTMLDivElement {
	const el = document.createElement('div')

	for (let i = 0; i < handleCount; i++) {
		const handle = document.createElement('div')

		handle.setAttribute('data-slot', 'resizable-handle')

		Object.defineProperty(handle, 'getBoundingClientRect', {
			value: () => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }),
		})

		el.appendChild(handle)
	}

	Object.defineProperty(el, 'getBoundingClientRect', {
		value: () => ({
			width: rect.width,
			height: rect.height,
			top: 0,
			left: 0,
			right: rect.width,
			bottom: rect.height,
		}),
	})

	return el
}

function makeRef(el: HTMLDivElement | null): RefObject<HTMLDivElement | null> {
	const ref = createRef<HTMLDivElement | null>()

	;(ref as { current: HTMLDivElement | null }).current = el

	return ref
}

const equalPanels: PanelConfig[] = [
	{ defaultSize: 1, minSize: 0, maxSize: 100 },
	{ defaultSize: 1, minSize: 0, maxSize: 100 },
]

describe('useResizablePanel', () => {
	afterEach(() => {
		document.body.innerHTML = ''
	})

	describe('initial sizes', () => {
		it('normalizes defaultSizes to sum to 100', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: equalPanels,
				}),
			)

			expect(result.current.sizes).toEqual([50, 50])
		})

		it('preserves sizes when defaults already sum to 100', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: [
						{ defaultSize: 30, minSize: 0, maxSize: 100 },
						{ defaultSize: 70, minSize: 0, maxSize: 100 },
					],
				}),
			)

			expect(result.current.sizes).toEqual([30, 70])
		})

		it('handles a three-panel configuration', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: [
						{ defaultSize: 1, minSize: 0, maxSize: 100 },
						{ defaultSize: 2, minSize: 0, maxSize: 100 },
						{ defaultSize: 1, minSize: 0, maxSize: 100 },
					],
				}),
			)

			expect(result.current.sizes).toEqual([25, 50, 25])
		})
	})

	describe('resize (keyboard-style nudge)', () => {
		it('shifts size from the right panel to the left panel', () => {
			const onSizesChange = vi.fn()

			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: equalPanels,
					onSizesChange,
				}),
			)

			act(() => result.current.resize(0, 10))

			expect(result.current.sizes).toEqual([60, 40])
			expect(onSizesChange).toHaveBeenCalledWith([60, 40])
		})

		it('clamps to the right panel maxSize', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: [
						{ defaultSize: 1, minSize: 0, maxSize: 80 },
						{ defaultSize: 1, minSize: 20, maxSize: 100 },
					],
				}),
			)

			act(() => result.current.resize(0, 90))

			expect(result.current.sizes[1]).toBe(20)
			expect(result.current.sizes[0]).toBe(80)
		})

		it('clamps to the left panel minSize', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: [
						{ defaultSize: 1, minSize: 20, maxSize: 100 },
						{ defaultSize: 1, minSize: 0, maxSize: 100 },
					],
				}),
			)

			act(() => result.current.resize(0, -90))

			expect(result.current.sizes[0]).toBe(20)
			expect(result.current.sizes[1]).toBe(80)
		})

		it('preserves total size after resize', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: equalPanels,
				}),
			)

			act(() => result.current.resize(0, 17))

			const total = result.current.sizes.reduce((sum, s) => sum + s, 0)

			expect(total).toBeCloseTo(100, 5)
		})

		it('does nothing when handleIndex is out of range', () => {
			const onSizesChange = vi.fn()

			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: equalPanels,
					onSizesChange,
				}),
			)

			act(() => result.current.resize(5, 10))

			expect(result.current.sizes).toEqual([50, 50])
			expect(onSizesChange).not.toHaveBeenCalled()
		})

		it('resizes the correct pair when there are more than two panels', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: [
						{ defaultSize: 1, minSize: 0, maxSize: 100 },
						{ defaultSize: 1, minSize: 0, maxSize: 100 },
						{ defaultSize: 1, minSize: 0, maxSize: 100 },
					],
				}),
			)

			act(() => result.current.resize(1, 10))

			const [a, b, c] = result.current.sizes

			expect(a).toBeCloseTo(33.333, 2)
			expect(b).toBeCloseTo(43.333, 2)
			expect(c).toBeCloseTo(23.333, 2)
		})
	})

	describe('dragging state', () => {
		it('exposes dragging=null initially', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: equalPanels,
				}),
			)

			expect(result.current.dragging).toBeNull()
		})

		it('ignores startDrag when groupRef is null', () => {
			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(null),
					direction: 'horizontal',
					panelConfigs: equalPanels,
				}),
			)

			act(() => {
				result.current.startDrag(0, makePointerEvent({ button: 0, clientX: 0, clientY: 0 }))
			})

			expect(result.current.dragging).toBeNull()
		})

		it('ignores non-primary buttons', () => {
			const group = makeGroup({ width: 1000, height: 100 })

			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(group),
					direction: 'horizontal',
					panelConfigs: equalPanels,
				}),
			)

			act(() => {
				result.current.startDrag(0, makePointerEvent({ button: 2, clientX: 0, clientY: 0 }))
			})

			expect(result.current.dragging).toBeNull()
		})

		it('sets dragging=handleIndex on a valid startDrag and clears on pointerup', () => {
			const group = makeGroup({ width: 1000, height: 100 })

			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(group),
					direction: 'horizontal',
					panelConfigs: equalPanels,
				}),
			)

			const preventDefault = vi.fn()

			act(() => {
				result.current.startDrag(
					0,
					makePointerEvent({ button: 0, clientX: 100, clientY: 0, preventDefault }),
				)
			})

			expect(preventDefault).toHaveBeenCalled()
			expect(result.current.dragging).toBe(0)

			act(() => {
				document.dispatchEvent(new Event('pointerup'))
			})

			expect(result.current.dragging).toBeNull()
		})
	})

	describe('drag commits sizes via pointermove', () => {
		it('updates sizes proportionally to pointer delta along the active axis', () => {
			const group = makeGroup({ width: 1000, height: 100 })

			const onSizesChange = vi.fn()

			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(group),
					direction: 'horizontal',
					panelConfigs: equalPanels,
					onSizesChange,
				}),
			)

			act(() => {
				result.current.startDrag(0, makePointerEvent({ button: 0, clientX: 500, clientY: 0 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 600, clientY: 0 }))
			})

			// 100px delta / 1000px available = 10% shift.
			expect(result.current.sizes).toEqual([60, 40])
			expect(onSizesChange).toHaveBeenLastCalledWith([60, 40])
		})

		it('uses clientY when direction is vertical', () => {
			const group = makeGroup({ width: 100, height: 1000 })

			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(group),
					direction: 'vertical',
					panelConfigs: equalPanels,
				}),
			)

			act(() => {
				result.current.startDrag(0, makePointerEvent({ button: 0, clientX: 0, clientY: 500 }))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 700 }))
			})

			expect(result.current.sizes).toEqual([70, 30])
		})

		it('stops updating after pointerup', () => {
			const group = makeGroup({ width: 1000, height: 100 })

			const { result } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(group),
					direction: 'horizontal',
					panelConfigs: equalPanels,
				}),
			)

			act(() => {
				result.current.startDrag(0, makePointerEvent({ button: 0, clientX: 500, clientY: 0 }))
			})

			act(() => {
				document.dispatchEvent(new Event('pointerup'))
			})

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 900, clientY: 0 }))
			})

			expect(result.current.sizes).toEqual([50, 50])
		})
	})

	describe('unmount cleanup', () => {
		it('removes document listeners on unmount mid-drag', () => {
			const group = makeGroup({ width: 1000, height: 100 })

			const onSizesChange = vi.fn()

			const { result, unmount } = renderHook(() =>
				useResizablePanel({
					groupRef: makeRef(group),
					direction: 'horizontal',
					panelConfigs: equalPanels,
					onSizesChange,
				}),
			)

			act(() => {
				result.current.startDrag(0, makePointerEvent({ button: 0, clientX: 500, clientY: 0 }))
			})

			onSizesChange.mockClear()

			unmount()

			act(() => {
				document.dispatchEvent(new PointerEvent('pointermove', { clientX: 900 }))
			})

			expect(onSizesChange).not.toHaveBeenCalled()
		})
	})
})
