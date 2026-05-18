import { renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSignaturePadDrawing } from '../../components/signature-pad/use-signature-pad-drawing'

function makeContext() {
	return {
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
		fillStyle: '',
	} as unknown as CanvasRenderingContext2D & {
		beginPath: ReturnType<typeof vi.fn>
		moveTo: ReturnType<typeof vi.fn>
		lineTo: ReturnType<typeof vi.fn>
		stroke: ReturnType<typeof vi.fn>
		arc: ReturnType<typeof vi.fn>
		fill: ReturnType<typeof vi.fn>
	}
}

function makeCanvas(context: CanvasRenderingContext2D | null) {
	const canvas = document.createElement('canvas')

	canvas.getBoundingClientRect = () =>
		({ x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }) as DOMRect

	canvas.getContext = (() => context) as unknown as HTMLCanvasElement['getContext']

	canvas.toDataURL = () => 'data:image/png;base64,abc'

	return canvas
}

function makeEvent(overrides: Partial<ReactPointerEvent> = {}) {
	const target = {
		setPointerCapture: vi.fn(),
	}

	return {
		clientX: 10,
		clientY: 20,
		pointerId: 1,
		pointerType: 'pen',
		button: 0,
		currentTarget: target,
		preventDefault: vi.fn(),
		...overrides,
	} as unknown as ReactPointerEvent
}

function setup(
	options: {
		disabled?: boolean
		readOnly?: boolean
		isEmpty?: boolean
		context?: CanvasRenderingContext2D | null
	} = {},
) {
	const context = options.context === undefined ? makeContext() : options.context

	const canvas = makeCanvas(context)

	const setIsEmpty = vi.fn()
	const setCurrent = vi.fn()

	const lastEmittedRef = { current: null as string | null }

	const { result } = renderHook(() =>
		useSignaturePadDrawing({
			canvasRef: { current: canvas },
			disabled: options.disabled,
			readOnly: options.readOnly,
			strokeColor: '#000000',
			strokeWidth: 2,
			isEmpty: options.isEmpty ?? true,
			setIsEmpty,
			lastEmittedRef,
			setCurrent,
		}),
	)

	return { api: result.current, canvas, context, setIsEmpty, setCurrent, lastEmittedRef }
}

describe('useSignaturePadDrawing: handlePointerDown', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	it('begins a stroke and draws a dot at the pointer position', () => {
		const { api, context } = setup()

		const event = makeEvent()

		api.handlePointerDown(event)

		expect(event.preventDefault).toHaveBeenCalled()

		const mock = context as ReturnType<typeof makeContext>

		expect(mock.beginPath).toHaveBeenCalled()

		expect(mock.moveTo).toHaveBeenCalledWith(10, 20)

		expect(mock.arc).toHaveBeenCalled()

		expect(mock.fill).toHaveBeenCalled()
	})

	it('captures the pointer on the target', () => {
		const { api } = setup()

		const event = makeEvent()

		api.handlePointerDown(event)

		expect(
			(event.currentTarget as unknown as { setPointerCapture: ReturnType<typeof vi.fn> })
				.setPointerCapture,
		).toHaveBeenCalledWith(1)
	})

	it('is a no-op when disabled', () => {
		const { api, context } = setup({ disabled: true })

		const event = makeEvent()

		api.handlePointerDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect((context as ReturnType<typeof makeContext>).beginPath).not.toHaveBeenCalled()
	})

	it('is a no-op when readOnly', () => {
		const { api, context } = setup({ readOnly: true })

		const event = makeEvent()

		api.handlePointerDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect((context as ReturnType<typeof makeContext>).beginPath).not.toHaveBeenCalled()
	})

	it('ignores non-left mouse buttons', () => {
		const { api } = setup()

		const event = makeEvent({ pointerType: 'mouse', button: 2 })

		api.handlePointerDown(event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('does not throw when the canvas has no 2d context', () => {
		const { api } = setup({ context: null })

		const event = makeEvent()

		expect(() => api.handlePointerDown(event)).not.toThrow()
	})
})

describe('useSignaturePadDrawing: handlePointerMove', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	it('is a no-op before a stroke has started', () => {
		const { api, context } = setup()

		api.handlePointerMove(makeEvent({ clientX: 30, clientY: 40 }))

		expect((context as ReturnType<typeof makeContext>).stroke).not.toHaveBeenCalled()
	})

	it('draws a line segment from the last point and sets isEmpty=false on first move', () => {
		const { api, context, setIsEmpty } = setup({ isEmpty: true })

		api.handlePointerDown(makeEvent({ clientX: 10, clientY: 20 }))

		api.handlePointerMove(makeEvent({ clientX: 30, clientY: 40 }))

		const mock = context as ReturnType<typeof makeContext>

		expect(mock.moveTo).toHaveBeenCalledWith(10, 20)

		expect(mock.lineTo).toHaveBeenCalledWith(30, 40)

		expect(mock.stroke).toHaveBeenCalled()

		expect(setIsEmpty).toHaveBeenCalledWith(false)
	})

	it('does not call setIsEmpty again when already non-empty', () => {
		const { api, setIsEmpty } = setup({ isEmpty: false })

		api.handlePointerDown(makeEvent())

		api.handlePointerMove(makeEvent({ clientX: 30, clientY: 40 }))

		expect(setIsEmpty).not.toHaveBeenCalled()
	})
})

describe('useSignaturePadDrawing: commit', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	it('is a no-op when no stroke is in progress', () => {
		const { api, setCurrent } = setup()

		api.commit()

		expect(setCurrent).not.toHaveBeenCalled()
	})

	it('emits the canvas data url and updates the last-emitted ref', () => {
		const { api, setCurrent, lastEmittedRef } = setup()

		api.handlePointerDown(makeEvent())

		api.commit()

		expect(setCurrent).toHaveBeenCalledWith('data:image/png;base64,abc')

		expect(lastEmittedRef.current).toBe('data:image/png;base64,abc')
	})

	it('ignores a second commit with no further drawing', () => {
		const { api, setCurrent } = setup()

		api.handlePointerDown(makeEvent())

		api.commit()

		setCurrent.mockClear()

		api.commit()

		expect(setCurrent).not.toHaveBeenCalled()
	})
})
