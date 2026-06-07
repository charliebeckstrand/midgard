import { renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { type DragPosition, useColorDrag } from '../../components/color/use-color-drag'
import { makePointerEvent } from '../helpers'

/**
 * A single node standing in for the tracked element: it owns the bounding rect
 * the hook samples and the pointer-capture surface it drives, so `ref.current`
 * and `event.currentTarget` are the same DOM node, as in the real components.
 */
function makeNode() {
	const node = document.createElement('div')

	node.getBoundingClientRect = () => DOMRect.fromRect({ width: 200, height: 100 })

	node.focus = vi.fn()

	node.setPointerCapture = vi.fn()

	node.releasePointerCapture = vi.fn()

	node.hasPointerCapture = vi.fn(() => true)

	return node
}

function makeEvent(node: HTMLElement, overrides: Partial<ReactPointerEvent<HTMLElement>> = {}) {
	return makePointerEvent<HTMLElement>({ currentTarget: node, target: node, ...overrides })
}

function setup(disabled = false) {
	const node = makeNode()

	const onPosition = vi.fn<(position: DragPosition) => void>()

	const { result } = renderHook(() => useColorDrag({ current: node }, onPosition, disabled))

	return { api: result.current, node, onPosition }
}

describe('useColorDrag', () => {
	it('captures the pointer, focuses the node, and reports the press position', () => {
		const { api, node, onPosition } = setup()

		api.onPointerDown(makeEvent(node, { clientX: 100, clientY: 50 }))

		expect(node.focus).toHaveBeenCalled()

		expect(node.setPointerCapture).toHaveBeenCalledWith(1)

		expect(onPosition).toHaveBeenCalledWith({ x: 0.5, y: 0.5 })
	})

	it('ignores moves before a press and tracks them after', () => {
		const { api, node, onPosition } = setup()

		api.onPointerMove(makeEvent(node, { clientX: 50, clientY: 25 }))

		expect(onPosition).not.toHaveBeenCalled()

		api.onPointerDown(makeEvent(node, { clientX: 0, clientY: 0 }))

		onPosition.mockClear()

		api.onPointerMove(makeEvent(node, { clientX: 50, clientY: 25 }))

		expect(onPosition).toHaveBeenCalledWith({ x: 0.25, y: 0.25 })
	})

	it('is a no-op when disabled', () => {
		const { api, node, onPosition } = setup(true)

		const event = makeEvent(node, { clientX: 100, clientY: 50 })

		api.onPointerDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(node.setPointerCapture).not.toHaveBeenCalled()

		expect(onPosition).not.toHaveBeenCalled()
	})

	it('ignores non-primary buttons', () => {
		const { api, node, onPosition } = setup()

		api.onPointerDown(makeEvent(node, { button: 2, clientX: 100, clientY: 50 }))

		expect(node.setPointerCapture).not.toHaveBeenCalled()

		expect(onPosition).not.toHaveBeenCalled()
	})

	it('onPointerUp ends the drag so later moves are ignored', () => {
		const { api, node, onPosition } = setup()

		api.onPointerDown(makeEvent(node, { clientX: 0, clientY: 0 }))

		api.onPointerUp(makeEvent(node))

		onPosition.mockClear()

		api.onPointerMove(makeEvent(node, { clientX: 100, clientY: 50 }))

		expect(onPosition).not.toHaveBeenCalled()
	})

	it('onPointerCancel ends the drag so later moves are ignored', () => {
		const { api, node, onPosition } = setup()

		api.onPointerDown(makeEvent(node, { clientX: 0, clientY: 0 }))

		api.onPointerCancel(makeEvent(node))

		onPosition.mockClear()

		api.onPointerMove(makeEvent(node, { clientX: 100, clientY: 50 }))

		expect(onPosition).not.toHaveBeenCalled()
	})

	// Regression: capture can end without a pointerup reaching the node (a
	// browser-claimed gesture, the node being torn out). Before, `dragging`
	// stayed set and the handle kept tracking the pointer until the next click.
	it('onLostPointerCapture ends the drag so a captureless move is ignored', () => {
		const { api, node, onPosition } = setup()

		api.onPointerDown(makeEvent(node, { clientX: 0, clientY: 0 }))

		api.onLostPointerCapture()

		onPosition.mockClear()

		api.onPointerMove(makeEvent(node, { clientX: 100, clientY: 50 }))

		expect(onPosition).not.toHaveBeenCalled()
	})
})
