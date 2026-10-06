import { renderHook } from '@testing-library/react'
import { type RefObject, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSignaturePadCanvasSizing } from '../../components/signature-pad/use-signature-pad-canvas-sizing'
import { makeCanvasContext } from '../helpers'

type ContainerRef = RefObject<HTMLDivElement | null>

type CanvasRef = RefObject<HTMLCanvasElement | null>

function setup(opts: {
	containerSize?: { width: number; height: number } | null
	canvasNull?: boolean
	contextNull?: boolean
	empty?: boolean
	padding?: number
}) {
	const containerSize =
		opts.containerSize === undefined ? { width: 320, height: 80 } : opts.containerSize

	const context = makeCanvasContext({ scale: vi.fn() })

	const canvas = opts.canvasNull ? null : document.createElement('canvas')

	if (canvas) {
		canvas.getContext = (() =>
			opts.contextNull ? null : context) as HTMLCanvasElement['getContext']

		canvas.toDataURL = () => 'data:,snapshot'

		canvas.getBoundingClientRect = () => DOMRect.fromRect({ width: 100, height: 60 })
	}

	const container = containerSize === null ? null : document.createElement('div')

	if (container && containerSize) {
		// jsdom has no layout, so the test gives the client size. The client size
		// is the padding box, inside the border.
		Object.defineProperty(container, 'clientWidth', { value: containerSize.width })
		Object.defineProperty(container, 'clientHeight', { value: containerSize.height })

		// A 1px border makes the border box larger than the client size.
		container.getBoundingClientRect = () =>
			DOMRect.fromRect({ width: containerSize.width + 2, height: containerSize.height + 2 })

		if (opts.padding) container.style.padding = `${opts.padding}px`
	}

	const { result, unmount } = renderHook(() => {
		const containerRef = useRef<HTMLDivElement | null>(container)

		const canvasRef = useRef<HTMLCanvasElement | null>(canvas)

		useSignaturePadCanvasSizing({
			containerRef: containerRef as ContainerRef,
			canvasRef: canvasRef as CanvasRef,
			empty: opts.empty ?? true,
			strokeColor: '#000',
			strokeWidth: 2,
		})

		return { containerRef, canvasRef }
	})

	return { result, unmount, canvas, context }
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('useSignaturePadCanvasSizing', () => {
	it('sizes the canvas using devicePixelRatio when a container is present', () => {
		vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2)

		const { canvas, context } = setup({})

		expect(canvas?.width).toBe(640)

		expect(canvas?.height).toBe(160)

		expect(canvas?.style.width).toBe('320px')

		expect(canvas?.style.height).toBe('80px')

		expect(context.scale).toHaveBeenCalledWith(2, 2)
	})

	it('sizes the canvas to the content box, inside the border and the padding', () => {
		vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1)

		const { canvas } = setup({ padding: 4 })

		expect(canvas?.width).toBe(312)

		expect(canvas?.height).toBe(72)

		expect(canvas?.style.width).toBe('312px')

		expect(canvas?.style.height).toBe('72px')
	})

	it('defaults devicePixelRatio to 1 when it is unset', () => {
		vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(0)

		const { canvas } = setup({})

		expect(canvas?.width).toBe(320)
	})

	it.each([
		['width', { width: 0, height: 100 }],
		['height', { width: 100, height: 0 }],
	])('bails when the container has zero %s', (_name, containerSize) => {
		const { canvas, context } = setup({ containerSize })

		expect(canvas?.style.width).toBe('')

		expect(context.scale).not.toHaveBeenCalled()
	})

	it.each<[string, Parameters<typeof setup>[0]]>([
		['does nothing when the container ref is empty', { containerSize: null }],
		['does nothing when the canvas ref is empty', { canvasNull: true }],
		['skips configuration when the 2D context is unavailable', { contextNull: true }],
	])('%s', (_name, options) => {
		expect(() => setup(options)).not.toThrow()
	})
})
