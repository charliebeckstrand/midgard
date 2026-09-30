import { act, renderHook } from '@testing-library/react'
import { animate } from 'motion'
import { describe, expect, it, vi } from 'vitest'
import {
	type PanelResizeOptions,
	type PanelSide,
	panelAxis,
	usePanelResize,
} from '../../hooks/use-panel-resize'
import { makeKeyEvent, makePointerEvent, stubMatchMedia } from '../helpers'

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

/** What {@link renderResize} varies: the pull, its travel back, the resize, and the floor. */
type ResizeSetup = {
	pull?: boolean
	pullBack?: PanelResizeOptions['pullBack']
	resize?: boolean
	floorOf?: (panel: HTMLElement, size: number) => number
}

/** Renders the gesture for `side`. By default, no floor and no ceiling are in reach. */
function renderResize(
	side: PanelSide = 'bottom',
	{ pull, pullBack, resize, floorOf: floor }: ResizeSetup = {},
) {
	const onDismiss = vi.fn()
	const floorOf = vi.fn(floor ?? (() => 0))

	const hook = renderHook(
		({ open }) =>
			usePanelResize({
				side,
				open,
				onDismiss,
				floorOf,
				ceilingOf: () => 10_000,
				pull,
				pullBack,
				resize,
			}),
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

		it('dismisses on a flick whose release lands on the spot of the last move', () => {
			// iOS reports a touch that way, so the last move alone reads as still.
			const { result, onDismiss } = renderAttached('bottom')

			act(() => {
				result.current.handleProps.onPointerDown(
					makePointerEvent({ pointerType: 'touch', clientY: 400, timeStamp: 0 }),
				)
			})

			// 80 px in 80 ms is 1 px/ms, past the swipe speed.
			act(() => {
				window.dispatchEvent(windowPointer('pointermove', 440, 40))

				window.dispatchEvent(windowPointer('pointermove', 480, 80))

				window.dispatchEvent(windowPointer('pointerup', 480, 80))
			})

			expect(onDismiss).toHaveBeenCalledOnce()
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

	describe('pull', () => {
		/** A panel of 300 px that stops at 300 px, so each drag toward its edge pulls it. */
		function renderPulled(
			side: PanelSide = 'bottom',
			pull = true,
			resize = true,
			pullBack?: ResizeSetup['pullBack'],
		) {
			return renderAttached(side, { pull, resize, pullBack, floorOf: (_panel, size) => size })
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

		it('closes on a slow release while a third of the panel is pulled, and leaves from there', () => {
			const { result, onDismiss, panel } = renderPulled()

			drag(result, 500)

			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 500, 1000))
			})

			expect(onDismiss).toHaveBeenCalledOnce()

			// The exit slide starts from the pulled panel, not from its rest.
			expect(panel.style.height).toBe('300px')

			expect(panel.style.translate).toBe('0 100px')
		})

		it('keeps the panel open on a slow release while a sixth of it is pulled', () => {
			// A phone sheet springs back from a short pull, and so does this one.
			const { result, onDismiss, panel } = renderPulled()

			drag(result, 450)

			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 450, 1000))
			})

			expect(onDismiss).not.toHaveBeenCalled()

			// With no travel given, the panel goes back in one step.
			expect(panel.style.translate).toBe('')

			expect(result.current.size).toBe(300)
		})

		describe('with a travel back', () => {
			const pullBack = { type: 'spring', stiffness: 260, damping: 34 } as const

			it('springs a short pull back to the floor on the travel', () => {
				const { result, onDismiss, panel } = renderPulled('bottom', true, false, pullBack)

				drag(result, 450)

				act(() => {
					window.dispatchEvent(windowPointer('pointerup', 450, 1000))
				})

				expect(onDismiss).not.toHaveBeenCalled()

				expect(animate).toHaveBeenCalledWith(50, 0, expect.objectContaining(pullBack))

				// Each frame of the travel moves the panel, and the arrival clears the pull.
				const [, , options] = vi.mocked(animate).mock.calls[0] as unknown as [
					number,
					number,
					{ onUpdate: (at: number) => void; onComplete: () => void },
				]

				act(() => options.onUpdate(20))

				expect(panel.style.translate).toBe('0 20px')

				act(() => options.onComplete())

				expect(panel.style.translate).toBe('')
			})

			it('takes a press during the travel from where the panel stands', () => {
				const { result, panel } = renderPulled('bottom', true, false, pullBack)

				drag(result, 450)

				act(() => {
					window.dispatchEvent(windowPointer('pointerup', 450, 1000))
				})

				const travel = vi.mocked(animate).mock.results[0]?.value as { stop: () => void }

				const [, , options] = vi.mocked(animate).mock.calls[0] as unknown as [
					number,
					number,
					{ onUpdate: (at: number) => void },
				]

				act(() => options.onUpdate(20))

				const stop = vi.spyOn(travel, 'stop')

				// The grip now stands 20 px below the floor, at 420 px.
				act(() => {
					result.current.handleProps.onPointerDown(
						makePointerEvent({ pointerType: 'touch', clientY: 420, timeStamp: 2000 }),
					)
				})

				expect(stop).toHaveBeenCalled()

				act(() => {
					window.dispatchEvent(windowPointer('pointermove', 430, 2100))
				})

				// 10 px further, not 10 px from the floor.
				expect(panel.style.translate).toBe('0 30px')
			})

			it('goes back in one step for a reader who asks for reduced motion', () => {
				stubMatchMedia((query) => query.includes('reduce'))

				const { result, panel } = renderPulled('bottom', true, false, pullBack)

				drag(result, 450)

				act(() => {
					window.dispatchEvent(windowPointer('pointerup', 450, 1000))
				})

				expect(animate).not.toHaveBeenCalled()

				expect(panel.style.translate).toBe('')
			})
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

		describe('on a panel that does not resize', () => {
			it('writes no size, and grows nothing on a drag away from its edge', () => {
				const { result, panel } = renderPulled('bottom', true, false)

				drag(result, 300)

				expect(panel.style.height).toBe('')

				expect(panel.style.translate).toBe('')

				act(() => {
					window.dispatchEvent(windowPointer('pointerup', 300, 1000))
				})

				// No size is committed, so the panel keeps following its content.
				expect(result.current.size).toBeNull()
			})

			it('still pulls the panel off, and closes it on the release', () => {
				const { result, onDismiss, panel } = renderPulled('bottom', true, false)

				drag(result, 500)

				expect(panel.style.height).toBe('')

				expect(panel.style.translate).toBe('0 100px')

				act(() => {
					window.dispatchEvent(windowPointer('pointerup', 500, 1000))
				})

				expect(onDismiss).toHaveBeenCalledOnce()
			})

			it('keeps the panel open on a short pull, and commits no size', () => {
				const { result, onDismiss, panel } = renderPulled('bottom', true, false)

				drag(result, 405)

				act(() => {
					window.dispatchEvent(windowPointer('pointerup', 405, 1000))
				})

				expect(onDismiss).not.toHaveBeenCalled()

				expect(panel.style.translate).toBe('')

				expect(result.current.size).toBeNull()
			})

			it('leaves the arrow keys to the page', () => {
				const { result } = renderPulled('bottom', true, false)

				const event = makeKeyEvent<HTMLElement>('ArrowUp')

				act(() => result.current.handleProps.onKeyDown(event))

				expect(event.preventDefault).not.toHaveBeenCalled()

				expect(result.current.size).toBeNull()
			})
		})

		it('clears a pull that closed the panel when it opens again', () => {
			const { result, rerender, panel } = renderPulled()

			drag(result, 500)

			act(() => {
				window.dispatchEvent(windowPointer('pointerup', 500, 1000))
			})

			rerender({ open: false })

			// The exit slide still holds the pull.
			expect(panel.style.translate).toBe('0 100px')

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
