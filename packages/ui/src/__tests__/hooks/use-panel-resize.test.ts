import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type PanelSide, panelAxis, usePanelResize } from '../../hooks/use-panel-resize'
import { makeKeyEvent, makePointerEvent } from '../helpers'

/**
 * A panel that measures `height` px on each axis. jsdom lays nothing out.
 * `measure` sets the size that the next read gives.
 */
function makePanel(height = 300): HTMLDivElement & { measure: (size: number) => void } {
	const panel = document.createElement('div')

	let measured = height

	Object.defineProperty(panel, 'getBoundingClientRect', {
		value: () => DOMRect.fromRect({ width: measured, height: measured }),
	})

	return Object.assign(panel, {
		measure: (size: number) => {
			measured = size
		},
	})
}

/** A window pointer event at `y` px, stamped at `t` ms. The constructor takes no time stamp. */
function windowPointer(type: string, y: number, t: number): PointerEvent {
	const event = new PointerEvent(type, { clientX: y, clientY: y })

	Object.defineProperty(event, 'timeStamp', { value: t })

	return event
}

/** What {@link renderResize} varies: the pull, and the floor. */
type ResizeSetup = {
	pull?: boolean
	floorOf?: (panel: HTMLElement, size: number, rest: number) => number
}

/** Renders the gesture for `side`. By default, no floor and no ceiling are in reach. */
function renderResize(side: PanelSide = 'bottom', { pull, floorOf: floor }: ResizeSetup = {}) {
	const onDismiss = vi.fn()
	const floorOf = vi.fn(floor ?? (() => 0))

	const hook = renderHook(
		({ open }) => usePanelResize({ side, open, onDismiss, floorOf, ceilingOf: () => 10_000, pull }),
		{ initialProps: { open: true } },
	)

	return { ...hook, onDismiss, floorOf }
}

/** Renders the gesture and gives it a panel. */
function renderAttached(side: PanelSide = 'bottom', setup?: ResizeSetup) {
	const rendered = renderResize(side, setup)

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

		it('gives the floor the size the panel rested at, after a committed resize too', () => {
			const { result, floorOf, panel } = renderAttached()

			const floorArgs = () => floorOf.mock.lastCall?.slice(1)

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'touch', clientY: 400, timeStamp: 0 }),
				)
			})

			expect(floorArgs()).toEqual([300, 300])

			// A slow drag up commits a taller size.
			act(() => {
				window.dispatchEvent(windowPointer('pointermove', 300, 500))

				window.dispatchEvent(windowPointer('pointerup', 300, 1000))
			})

			panel.measure(400)

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'touch', clientY: 300, timeStamp: 2000 }),
				)
			})

			// The panel measures its committed size now, and it still rests at the first.
			expect(floorArgs()).toEqual([400, 300])
		})
	})

	describe('pull', () => {
		/** A panel of 300 px that stops at 300 px, so each drag toward its edge pulls it. */
		function renderPulled(side: PanelSide = 'bottom', pull = true) {
			return renderAttached(side, { pull, floorOf: (_panel, _size, rest) => rest })
		}

		/** Presses the grip at 400 px, then moves slowly to `to` px. */
		function drag(result: ReturnType<typeof renderPulled>['result'], to: number) {
			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'touch', clientX: 400, clientY: 400, timeStamp: 0 }),
				)
			})

			act(() => {
				window.dispatchEvent(windowPointer('pointermove', to, 500))
			})
		}

		it.each<[PanelSide, number, string]>([
			['bottom', 450, '0 50px'],
			['top', 350, '0 -50px'],
			['right', 450, '50px'],
			['left', 350, '-50px'],
		])('pulls a %s panel past its floor toward its edge', (side, to, translate) => {
			const { result, panel } = renderPulled(side)

			drag(result, to)

			// The size stops at the floor, and the panel follows the pointer on.
			expect(panel.style[panelAxis(side)]).toBe('300px')

			expect(panel.style.translate).toBe(translate)
		})

		it('closes on a slow release while the panel is pulled, and leaves from there', () => {
			const { result, onDismiss, panel } = renderPulled()

			drag(result, 450)

			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 450, 1000))
			})

			expect(onDismiss).toHaveBeenCalledOnce()

			// The exit slide starts from the pulled panel, not from its rest.
			expect(panel.style.height).toBe('300px')

			expect(panel.style.translate).toBe('0 50px')
		})

		it('keeps the panel open on a release back at the floor', () => {
			const { result, onDismiss, panel } = renderPulled()

			drag(result, 450)

			// The pointer comes back up to within a few pixels of the floor.
			act(() => {
				window.dispatchEvent(windowPointer('pointermove', 405, 1000))

				window.dispatchEvent(windowPointer('pointerup', 405, 1500))
			})

			expect(onDismiss).not.toHaveBeenCalled()

			expect(panel.style.translate).toBe('')

			expect(result.current.size).toBe(300)
		})

		it('stops at the floor without the pull, as a splitter does', () => {
			const { result, onDismiss, panel } = renderPulled('bottom', false)

			drag(result, 450)

			expect(panel.style.translate).toBe('')

			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 450, 1000))
			})

			expect(onDismiss).not.toHaveBeenCalled()

			expect(result.current.size).toBe(300)
		})

		it('clears a pull that closed the panel when it opens again', () => {
			const { result, rerender, panel } = renderPulled()

			drag(result, 450)

			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 450, 1000))
			})

			rerender({ open: false })

			// The exit slide still holds the pull.
			expect(panel.style.translate).toBe('0 50px')

			// A reopen before the slide ends takes the same node back.
			rerender({ open: true })

			expect(panel.style.translate).toBe('')
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
