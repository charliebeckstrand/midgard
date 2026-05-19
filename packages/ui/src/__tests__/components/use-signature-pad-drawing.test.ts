import { act, renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useSignaturePadDrawing } from '../../components/signature-pad/use-signature-pad-drawing'
import { makeCanvasContext, makePointerEvent } from '../helpers'

type Setup = {
	disabled?: boolean
	readOnly?: boolean
	isEmpty?: boolean
	contextNull?: boolean
	canvasNull?: boolean
}

function setup({
	disabled = false,
	readOnly = false,
	isEmpty = true,
	contextNull = false,
	canvasNull = false,
}: Setup = {}) {
	const context = makeCanvasContext()

	const canvas = canvasNull ? null : document.createElement('canvas')

	if (canvas) {
		canvas.getContext = (() => (contextNull ? null : context)) as HTMLCanvasElement['getContext']

		canvas.toDataURL = () => 'data:,strokes'

		canvas.getBoundingClientRect = () => DOMRect.fromRect({ width: 100, height: 100 })
	}

	const setIsEmpty = vi.fn()

	const setCurrent = vi.fn()

	const lastEmittedRef = { current: null as string | null }

	const { result } = renderHook(() => {
		const canvasRef = useRef<HTMLCanvasElement | null>(canvas)

		return useSignaturePadDrawing({
			canvasRef,
			disabled,
			readOnly,
			strokeColor: '#000',
			strokeWidth: 2,
			isEmpty,
			setIsEmpty,
			lastEmittedRef,
			setCurrent,
		})
	})

	return { result, context, canvas, setIsEmpty, setCurrent, lastEmittedRef }
}

function pointerEvent(overrides: Partial<ReactPointerEvent> = {}): ReactPointerEvent {
	const target = document.createElement('div')

	target.setPointerCapture = vi.fn()

	return makePointerEvent({
		clientX: 10,
		clientY: 10,
		button: 0,
		pointerId: 1,
		pointerType: 'mouse',
		currentTarget: target,
		...overrides,
	})
}

describe('useSignaturePadDrawing', () => {
	it('does nothing on pointerdown when disabled', () => {
		const { result, context } = setup({ disabled: true })

		act(() => {
			result.current.handlePointerDown(pointerEvent())
		})

		expect(context.beginPath).not.toHaveBeenCalled()
	})

	it('does nothing on pointerdown when readOnly', () => {
		const { result, context } = setup({ readOnly: true })

		act(() => {
			result.current.handlePointerDown(pointerEvent())
		})

		expect(context.beginPath).not.toHaveBeenCalled()
	})

	it('ignores non-primary mouse buttons', () => {
		const { result, context } = setup()

		act(() => {
			result.current.handlePointerDown(pointerEvent({ button: 2 }))
		})

		expect(context.beginPath).not.toHaveBeenCalled()
	})

	it('starts a stroke with a dot on pointerdown', () => {
		const { result, context } = setup()

		act(() => {
			result.current.handlePointerDown(pointerEvent({ clientX: 5, clientY: 5 }))
		})

		expect(context.beginPath).toHaveBeenCalled()

		expect(context.moveTo).toHaveBeenCalledWith(5, 5)

		expect(context.arc).toHaveBeenCalled()

		expect(context.fill).toHaveBeenCalled()
	})

	it('captures the pointer on the target', () => {
		const { result } = setup()

		const event = pointerEvent()

		act(() => {
			result.current.handlePointerDown(event)
		})

		expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(1)
	})

	it('does not throw when the canvas has no 2d context', () => {
		const { result } = setup({ contextNull: true })

		expect(() =>
			act(() => {
				result.current.handlePointerDown(pointerEvent())
			}),
		).not.toThrow()
	})

	it('does nothing on pointermove when no stroke is in progress', () => {
		const { result, context } = setup()

		act(() => {
			result.current.handlePointerMove(pointerEvent())
		})

		expect(context.lineTo).not.toHaveBeenCalled()
	})

	it('extends a stroke on pointermove after pointerdown', () => {
		const { result, context, setIsEmpty } = setup({ isEmpty: true })

		act(() => {
			result.current.handlePointerDown(pointerEvent({ clientX: 0, clientY: 0 }))
		})

		act(() => {
			result.current.handlePointerMove(pointerEvent({ clientX: 20, clientY: 30 }))
		})

		expect(context.lineTo).toHaveBeenCalledWith(20, 30)

		expect(context.stroke).toHaveBeenCalled()

		expect(setIsEmpty).toHaveBeenCalledWith(false)
	})

	it('does not flip isEmpty when pointermove fires on an already-non-empty pad', () => {
		const { result, setIsEmpty } = setup({ isEmpty: false })

		act(() => {
			result.current.handlePointerDown(pointerEvent({ clientX: 0, clientY: 0 }))
		})

		act(() => {
			result.current.handlePointerMove(pointerEvent({ clientX: 10, clientY: 10 }))
		})

		expect(setIsEmpty).not.toHaveBeenCalled()
	})

	it('commits the canvas snapshot via setCurrent on commit()', () => {
		const { result, setCurrent, lastEmittedRef } = setup()

		act(() => {
			result.current.handlePointerDown(pointerEvent({ clientX: 0, clientY: 0 }))
		})

		act(() => {
			result.current.commit()
		})

		expect(setCurrent).toHaveBeenCalledWith('data:,strokes')

		expect(lastEmittedRef.current).toBe('data:,strokes')
	})

	it('is a no-op when commit() is called without an active stroke', () => {
		const { result, setCurrent } = setup()

		act(() => {
			result.current.commit()
		})

		expect(setCurrent).not.toHaveBeenCalled()
	})

	it('ignores a second commit with no further drawing', () => {
		const { result, setCurrent } = setup()

		act(() => {
			result.current.handlePointerDown(pointerEvent({ clientX: 0, clientY: 0 }))
		})

		act(() => {
			result.current.commit()
		})

		setCurrent.mockClear()

		act(() => {
			result.current.commit()
		})

		expect(setCurrent).not.toHaveBeenCalled()
	})
})
