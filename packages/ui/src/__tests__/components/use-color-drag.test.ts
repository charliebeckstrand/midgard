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

	// A spy over the setup's capture stub, so `hasPointerCapture` still answers
	// what the drag took and released.
	vi.spyOn(node, 'setPointerCapture')

	return node
}

function makeEvent(node: HTMLElement, overrides: Partial<ReactPointerEvent<HTMLElement>> = {}) {
	return makePointerEvent<HTMLElement>({ currentTarget: node, target: node, ...overrides })
}

function setup(disabled = false) {
	const node = makeNode()

	const onPosition = vi.fn<(position: DragPosition) => void>()

	const { result } = renderHook(() =>
		useColorDrag({ current: node }, onPosition, disabled, 'crosshair'),
	)

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

	// A focus that scrolls the node into view moves its rect below the pointer.
	// The press must report the point below the pointer, so the focus must not scroll.
	it('focuses without a scroll, so the press reports the point below the pointer', () => {
		const { api, node, onPosition } = setup()

		let top = 0

		node.getBoundingClientRect = () => DOMRect.fromRect({ y: top, width: 200, height: 100 })

		// As in a browser, a focus without `preventScroll` scrolls the page by 40 px.
		node.focus = vi.fn((options?: FocusOptions) => {
			if (!options?.preventScroll) top -= 40
		})

		api.onPointerDown(makeEvent(node, { clientX: 100, clientY: 50 }))

		expect(node.focus).toHaveBeenCalled()

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

	// A disabled `<fieldset>` disables only its native controls. The node is a
	// `<div>`, so the hook reads the fieldset itself when the press occurs.
	it('is a no-op under a disabled ancestor fieldset', () => {
		const { api, node, onPosition } = setup()

		const fieldset = document.createElement('fieldset')

		fieldset.disabled = true

		fieldset.append(node)

		const event = makeEvent(node, { clientX: 100, clientY: 50 })

		api.onPointerDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(node.setPointerCapture).not.toHaveBeenCalled()

		expect(onPosition).not.toHaveBeenCalled()
	})

	// The first legend of a disabled fieldset stays enabled, as with a native
	// control in it.
	it('drags in the first legend of a disabled fieldset', () => {
		const { api, node, onPosition } = setup()

		const fieldset = document.createElement('fieldset')

		const legend = document.createElement('legend')

		fieldset.disabled = true

		legend.append(node)

		fieldset.append(legend)

		api.onPointerDown(makeEvent(node, { clientX: 100, clientY: 50 }))

		expect(onPosition).toHaveBeenCalledWith({ x: 0.5, y: 0.5 })
	})

	it.each([
		['a secondary button', { button: 2 }],
		['a macOS Ctrl-click', { ctrlKey: true }],
		['a pointer that is not primary', { isPrimary: false }],
	])('ignores %s', (_name, init) => {
		const { api, node, onPosition } = setup()

		api.onPointerDown(makeEvent(node, { clientX: 100, clientY: 50, ...init }))

		expect(node.setPointerCapture).not.toHaveBeenCalled()

		expect(onPosition).not.toHaveBeenCalled()
	})

	// Capture can end without a pointerup reaching the node (a browser-claimed
	// gesture, the node being torn out); the lost-capture handler clears
	// `dragging` so the handle stops tracking the pointer.
	it.each<[string, (api: ReturnType<typeof setup>['api'], node: HTMLElement) => void]>([
		['onPointerUp', (api, node) => api.onPointerUp(makeEvent(node))],
		['onPointerCancel', (api, node) => api.onPointerCancel(makeEvent(node))],
		['onLostPointerCapture', (api) => api.onLostPointerCapture()],
	])('%s ends the drag so later moves are ignored', (_name, end) => {
		const { api, node, onPosition } = setup()

		api.onPointerDown(makeEvent(node, { clientX: 0, clientY: 0 }))

		end(api, node)

		onPosition.mockClear()

		api.onPointerMove(makeEvent(node, { clientX: 100, clientY: 50 }))

		expect(onPosition).not.toHaveBeenCalled()
	})
})
