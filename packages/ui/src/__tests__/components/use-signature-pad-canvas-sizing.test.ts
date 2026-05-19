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
	isEmpty?: boolean
}) {
	const containerSize =
		opts.containerSize === undefined ? { width: 320, height: 80 } : opts.containerSize

	const context = makeCanvasContext({ scale: vi.fn() })

	const canvas = opts.canvasNull ? null : document.createElement('canvas')

	if (canvas) {
		canvas.getContext = (() =>
			opts.contextNull ? null : context) as HTMLCanvasElement['getContext']

		canvas.toDataURL = () => 'data:,snapshot'

		canvas.getBoundingClientRect = () => ({ width: 100, height: 60 }) as DOMRect
	}

	const container = containerSize === null ? null : document.createElement('div')

	if (container && containerSize) {
		container.getBoundingClientRect = () => containerSize as DOMRect
	}

	const { result, unmount } = renderHook(() => {
		const containerRef = useRef<HTMLDivElement | null>(container)

		const canvasRef = useRef<HTMLCanvasElement | null>(canvas)

		useSignaturePadCanvasSizing({
			containerRef: containerRef as ContainerRef,
			canvasRef: canvasRef as CanvasRef,
			isEmpty: opts.isEmpty ?? true,
			strokeColor: '#000',
			strokeWidth: 2,
		})

		return { containerRef, canvasRef }
	})

	return { result, unmount, canvas, context }
}

const originalDevicePixelRatio = window.devicePixelRatio

afterEach(() => {
	vi.restoreAllMocks()

	Object.defineProperty(window, 'devicePixelRatio', {
		value: originalDevicePixelRatio,
		configurable: true,
	})
})

describe('useSignaturePadCanvasSizing', () => {
	it('sizes the canvas using devicePixelRatio when a container is present', () => {
		Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })

		const { canvas, context } = setup({})

		expect(canvas?.width).toBe(640)

		expect(canvas?.height).toBe(160)

		expect(canvas?.style.width).toBe('320px')

		expect(canvas?.style.height).toBe('80px')

		expect(context.scale).toHaveBeenCalledWith(2, 2)
	})

	it('defaults devicePixelRatio to 1 when it is unset', () => {
		Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true })

		const { canvas } = setup({})

		expect(canvas?.width).toBe(320)
	})

	it('bails when the container has zero width', () => {
		const { canvas, context } = setup({ containerSize: { width: 0, height: 100 } })

		expect(canvas?.style.width).toBe('')

		expect(context.scale).not.toHaveBeenCalled()
	})

	it('bails when the container has zero height', () => {
		const { canvas, context } = setup({ containerSize: { width: 100, height: 0 } })

		expect(canvas?.style.width).toBe('')

		expect(context.scale).not.toHaveBeenCalled()
	})

	it('does nothing when the container ref is empty', () => {
		expect(() => setup({ containerSize: null })).not.toThrow()
	})

	it('does nothing when the canvas ref is empty', () => {
		expect(() => setup({ canvasNull: true })).not.toThrow()
	})

	it('skips configuration when the 2D context is unavailable', () => {
		expect(() => setup({ contextNull: true })).not.toThrow()
	})
})
