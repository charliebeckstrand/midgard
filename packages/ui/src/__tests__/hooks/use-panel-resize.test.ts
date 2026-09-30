import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type PanelSide, usePanelResize } from '../../hooks/use-panel-resize'
import { makeKeyEvent, makePointerEvent } from '../helpers'

/** A panel that measures `height` px on each axis. jsdom lays nothing out. */
function makePanel(height = 300): HTMLDivElement {
	const panel = document.createElement('div')

	Object.defineProperty(panel, 'getBoundingClientRect', {
		value: () => DOMRect.fromRect({ width: height, height }),
	})

	return panel
}

/** A window pointer event at `y` px, stamped at `t` ms. The constructor takes no time stamp. */
function windowPointer(type: string, y: number, t: number): PointerEvent {
	const event = new PointerEvent(type, { clientX: y, clientY: y })

	Object.defineProperty(event, 'timeStamp', { value: t })

	return event
}

/** Renders the gesture for `side`, with no floor and no ceiling in reach. */
function renderResize(side: PanelSide = 'bottom') {
	const onDismiss = vi.fn()
	const floorOf = vi.fn(() => 0)

	const hook = renderHook(() =>
		usePanelResize({ side, open: true, onDismiss, floorOf, ceilingOf: () => 10_000 }),
	)

	return { ...hook, onDismiss, floorOf }
}

/** Renders the gesture and gives it a panel. */
function renderAttached(side: PanelSide = 'bottom') {
	const rendered = renderResize(side)

	const panel = makePanel()

	act(() => rendered.result.current.ref(panel))

	return { ...rendered, panel }
}

describe('usePanelResize', () => {
	describe('pointer', () => {
		it('ignores a press of a secondary mouse button', () => {
			const { result, floorOf } = renderAttached()

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'mouse', button: 2, clientY: 400 }),
				)
			})

			expect(result.current.resizing).toBe(false)

			expect(floorOf).not.toHaveBeenCalled()
		})

		it('ignores a press before the panel mounts', () => {
			const { result, floorOf } = renderResize()

			act(() => {
				result.current.handleProps.onPointerDown(makePointerEvent({ pointerType: 'touch' }))
			})

			expect(result.current.resizing).toBe(false)

			expect(floorOf).not.toHaveBeenCalled()
		})

		it('keeps the bounds of the first press when a second pointer lands mid-gesture', () => {
			const { result, floorOf } = renderAttached()

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'touch', clientY: 400, timeStamp: 0 }),
				)
			})

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'touch', clientY: 100, timeStamp: 10 }),
				)
			})

			expect(floorOf).toHaveBeenCalledOnce()

			// The second press did not move the start, so a release in place keeps the size.
			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 400, 1000))
			})

			expect(result.current.size).toBe(300)
		})

		it.each<[PanelSide, number]>([
			// A bottom panel is thrown down, and a top panel is thrown up.
			['bottom', 1],
			['top', -1],
		])('dismisses a %s panel on a flick toward its edge', (side, toward) => {
			const { result, onDismiss, panel } = renderAttached(side)

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'touch', clientY: 400, timeStamp: 0 }),
				)
			})

			act(() => {
				window.dispatchEvent(windowPointer('pointermove', 400 + toward * 10, 100))
			})

			expect(panel.style.height).not.toBe('')

			// 90px in 10ms is 9 px/ms, past the swipe speed.
			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 400 + toward * 100, 110))
			})

			expect(onDismiss).toHaveBeenCalledOnce()

			// The panel leaves at the size of its variant, not at the size of the swipe.
			expect(panel.style.height).toBe('')

			expect(result.current.resizing).toBe(false)
		})

		it('keeps a slow release away from the edge as a size', () => {
			const { result, onDismiss } = renderAttached('right')

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'touch', clientX: 400, timeStamp: 0 }),
				)
			})

			// A right panel grows as the pointer goes left.
			act(() => {
				window.dispatchEvent(windowPointer('pointermove', 350, 500))

				window.dispatchEvent(windowPointer('pointerup', 350, 1000))
			})

			expect(onDismiss).not.toHaveBeenCalled()

			expect(result.current.size).toBe(350)
		})
	})

	describe('keyboard', () => {
		it.each([
			['a key off the arrows', 'Enter'],
			['an arrow across the axis', 'ArrowLeft'],
		])('leaves %s to the page', (_name, key) => {
			const { result } = renderAttached('bottom')

			const event = makeKeyEvent<HTMLElement>(key)

			act(() => result.current.handleProps.onKeyDown(event))

			expect(event.preventDefault).not.toHaveBeenCalled()

			expect(result.current.size).toBeNull()
		})

		it('takes the arrow but sizes nothing before the panel mounts', () => {
			const { result } = renderResize('bottom')

			const event = makeKeyEvent<HTMLElement>('ArrowUp')

			act(() => result.current.handleProps.onKeyDown(event))

			expect(event.preventDefault).toHaveBeenCalled()

			expect(result.current.size).toBeNull()
		})
	})
})
