import { act, renderHook } from '@testing-library/react'
import type { DragControls } from 'motion/react'
import { describe, expect, it, vi } from 'vitest'
import * as announcer from '../../core/announcer'
import { type ReorderDragOptions, useReorderDrag } from '../../hooks/use-reorder-drag'

describe('useReorderDrag', () => {
	const ids = ['a', 'b', 'c']

	/** Controls that record the stop. The hook calls only `stop`. */
	const fakeControls = () => ({ stop: vi.fn() }) as unknown as DragControls & { stop: () => void }

	const setup = (enabled = true) => {
		const announce = vi.spyOn(announcer, 'announce').mockImplementation(() => {})

		const onReorder = vi.fn()

		const options: Omit<ReorderDragOptions, 'enabled'> = {
			ids,
			onReorder,
			name: (id) => id.toUpperCase(),
			onStart: () => {},
		}

		const hook = renderHook(
			(props: { enabled: boolean }) => useReorderDrag({ ...options, ...props }),
			{
				initialProps: { enabled },
			},
		)

		const controls = fakeControls()

		/** Starts a drag of `a` and moves it past `b` in the draft. */
		const dragPast = () => {
			act(() => hook.result.current.onDragStart('a', controls))

			act(() => hook.result.current.setDraft(['b', 'a', 'c']))
		}

		return { ...hook, announce, onReorder, controls, dragPast }
	}

	it('reports the draft once, on the drop', () => {
		const { result, onReorder, dragPast } = setup()

		dragPast()

		act(() => result.current.onDragEnd(new Event('pointerup')))

		expect(onReorder.mock.calls).toEqual([[['b', 'a', 'c'], 'a']])

		expect(result.current.order).toEqual(ids)
	})

	// Motion ends the drag on a pointercancel through the same handler as a
	// pointerup. The browser ended the gesture, so the user dropped nothing.
	it('reports nothing and announces the return when a pointercancel ends the drag', () => {
		const { result, onReorder, announce, dragPast } = setup()

		dragPast()

		act(() => result.current.onDragEnd(new Event('pointercancel')))

		expect(onReorder).not.toHaveBeenCalled()

		expect(result.current.order).toEqual(ids)

		expect(result.current.sorting).toBe(false)

		expect(announce).toHaveBeenLastCalledWith('Returned A to position 1 of 3.', { assertive: true })
	})

	// The disabled surface removes the start of the next drag, but the live
	// Motion session listens on the window and runs on to the drop.
	it('cancels a live drag when it turns disabled, and reports nothing on the drop', () => {
		const { result, rerender, onReorder, announce, controls, dragPast } = setup()

		dragPast()

		rerender({ enabled: false })

		expect(controls.stop).toHaveBeenCalledOnce()

		expect(result.current.order).toEqual(ids)

		// The stop runs the drop of the item.
		act(() => result.current.onDragEnd(new Event('pointermove')))

		expect(onReorder).not.toHaveBeenCalled()

		expect(announce).toHaveBeenLastCalledWith('Returned A to position 1 of 3.', { assertive: true })
	})

	it('stops nothing when it turns disabled with no live drag', () => {
		const { rerender, controls } = setup()

		rerender({ enabled: false })

		expect(controls.stop).not.toHaveBeenCalled()
	})
})
