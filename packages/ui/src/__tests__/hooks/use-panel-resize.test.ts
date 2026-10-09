import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type PanelSide, panelAxis, usePanelResize } from '../../hooks/use-panel-resize'
import { makeKeyEvent, makePointerEvent } from '../helpers'

/** A panel that measures `height` px on each axis. jsdom lays nothing out. */
function makePanel(height = 300): HTMLDivElement {
	const panel = document.createElement('div')

	Object.defineProperty(panel, 'getBoundingClientRect', {
		value: () => DOMRect.fromRect({ width: height, height }),
	})

	return panel
}

/** A window pointer event at `at` px on each axis, stamped at `t` ms. The constructor takes no time stamp. */
function windowPointer(type: string, at: number, t: number): PointerEvent {
	const event = new PointerEvent(type, { clientX: at, clientY: at })

	Object.defineProperty(event, 'timeStamp', { value: t })

	return event
}

/** Renders the gesture for `side`. By default, no floor and no ceiling are in reach. */
function renderResize(
	side: PanelSide = 'bottom',
	floor: (panel: HTMLElement, size: number) => number = () => 0,
) {
	const floorOf = vi.fn(floor)

	const hook = renderHook(
		({ open }) => usePanelResize({ side, open, floorOf, ceilingOf: () => 10_000 }),
		{ initialProps: { open: true } },
	)

	return { ...hook, floorOf }
}

/** Renders the gesture and gives it a panel. */
function renderAttached(
	side: PanelSide = 'bottom',
	floor?: (panel: HTMLElement, size: number) => number,
) {
	const rendered = renderResize(side, floor)

	const panel = makePanel()

	act(() => rendered.result.current.ref(panel))

	return { ...rendered, panel }
}

/** Presses the grip at 400 px on each axis. */
function press(result: ReturnType<typeof renderResize>['result']) {
	act(() => {
		result.current.handleProps.onPointerDown(
			makePointerEvent({ pointerType: 'touch', clientX: 400, clientY: 400, timeStamp: 0 }),
		)
	})
}

describe('usePanelResize', () => {
	describe('pointer', () => {
		it.each([
			['a secondary mouse button', { button: 2 }],
			['a macOS Ctrl-click', { ctrlKey: true }],
		])('ignores a press of %s', (_name, init) => {
			const { result, floorOf } = renderAttached()

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'mouse', clientY: 400, ...init }),
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

			press(result)

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
			// A bottom panel grows as the pointer goes up, and a right panel as it goes left.
			['bottom', 350],
			['top', 450],
			['right', 350],
			['left', 450],
		])('grows a %s panel away from its edge, and keeps the size of the release', (side, to) => {
			const { result, panel } = renderAttached(side)

			press(result)

			act(() => {
				window.dispatchEvent(windowPointer('pointermove', to, 500))
			})

			expect(panel.style[panelAxis(side)]).toBe('350px')

			act(() => {
				window.dispatchEvent(windowPointer('pointerup', to, 1000))
			})

			expect(result.current.size).toBe(350)

			expect(result.current.resizing).toBe(false)
		})

		it.each<[PanelSide, number]>([
			['bottom', 1],
			['top', -1],
		])('stops a %s panel at its floor on a fast drag toward its edge', (side, toward) => {
			// A drag that once threw the panel away now only resizes it.
			const { result, panel } = renderAttached(side, (_panel, size) => size - 50)

			press(result)

			// 300 px in 10 ms, far past the old swipe speed.
			act(() => {
				window.dispatchEvent(windowPointer('pointermove', 400 + toward * 100, 100))

				window.dispatchEvent(windowPointer('pointerup', 400 + toward * 300, 110))
			})

			expect(panel.style.height).toBe('250px')

			expect(panel.style.translate).toBe('')

			expect(result.current.size).toBe(250)
		})

		it('puts back the size of the press when the browser cancels the pointer', () => {
			// The browser cancels the touch when it takes it for a scroll. Chromium gives
			// the cancel the coordinates 0, 0.
			const { result, panel } = renderAttached()

			press(result)

			act(() => {
				window.dispatchEvent(windowPointer('pointermove', 380, 500))
			})

			expect(panel.style.height).toBe('320px')

			act(() => {
				window.dispatchEvent(windowPointer('pointercancel', 0, 600))
			})

			expect(panel.style.height).toBe('300px')

			expect(result.current.size).toBe(300)

			expect(result.current.resizing).toBe(false)
		})

		it('ends a gesture that the close interrupts, so the late release sets no size', () => {
			const { result, rerender } = renderAttached()

			press(result)

			rerender({ open: false })

			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 300, 1000))
			})

			expect(result.current.resizing).toBe(false)

			expect(result.current.size).toBeNull()
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
