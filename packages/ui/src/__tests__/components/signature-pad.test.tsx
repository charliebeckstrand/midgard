import type { PointerEvent as ReactPointerEvent } from 'react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SignaturePad, type SignaturePadHandle } from '../../components/signature-pad'
import {
	configureStroke,
	drawSnapshot,
	getCanvasPoint,
} from '../../components/signature-pad/utilities'
import { bySlot, renderUI, screen } from '../helpers'

describe('SignaturePad', () => {
	it('renders with data-slot="signature-pad"', () => {
		const { container } = renderUI(<SignaturePad />)

		const el = bySlot(container, 'signature-pad')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<SignaturePad className="custom" />)

		expect(bySlot(container, 'signature-pad')?.className).toContain('custom')
	})

	it('renders the canvas slot', () => {
		const { container } = renderUI(<SignaturePad />)

		const canvas = bySlot(container, 'signature-pad-canvas')

		expect(canvas).toBeInTheDocument()

		expect(canvas?.tagName).toBe('CANVAS')
	})

	it('renders the placeholder when empty', () => {
		renderUI(<SignaturePad placeholder="Sign here" />)

		expect(screen.getByText('Sign here')).toBeInTheDocument()
	})

	it('marks the root as empty by default', () => {
		const { container } = renderUI(<SignaturePad />)

		expect(bySlot(container, 'signature-pad')).toHaveAttribute('data-empty', 'true')
	})

	it('hides the placeholder when disabled', () => {
		renderUI(<SignaturePad disabled placeholder="Sign here" />)

		expect(screen.queryByText('Sign here')).not.toBeInTheDocument()
	})

	it('sets data-disabled when disabled', () => {
		const { container } = renderUI(<SignaturePad disabled />)

		expect(bySlot(container, 'signature-pad')).toHaveAttribute('data-disabled', 'true')
	})

	it('sets data-readonly when readOnly', () => {
		const { container } = renderUI(<SignaturePad readOnly />)

		expect(bySlot(container, 'signature-pad')).toHaveAttribute('data-readonly', 'true')
	})

	it('does not render the clear action when empty', () => {
		const { container } = renderUI(<SignaturePad />)

		expect(bySlot(container, 'signature-pad-clear')).not.toBeInTheDocument()
	})

	it('forwards an imperative handle with clear, toDataURL, and isEmpty', () => {
		const ref = createRef<SignaturePadHandle>()

		renderUI(<SignaturePad ref={ref} />)

		expect(typeof ref.current?.clear).toBe('function')

		expect(typeof ref.current?.toDataURL).toBe('function')

		expect(ref.current?.isEmpty()).toBe(true)
	})

	it('exposes the aria-label on the canvas', () => {
		const { container } = renderUI(<SignaturePad aria-label="Customer signature" />)

		expect(bySlot(container, 'signature-pad-canvas')).toHaveAttribute(
			'aria-label',
			'Customer signature',
		)
	})
})

describe('getCanvasPoint', () => {
	it('returns null when the canvas is missing', () => {
		const event = { clientX: 10, clientY: 20 } as ReactPointerEvent

		expect(getCanvasPoint(null, event)).toBeNull()
	})

	it('returns a canvas-relative point when the canvas is provided', () => {
		const canvas = document.createElement('canvas')

		canvas.getBoundingClientRect = () => ({
			x: 5,
			y: 10,
			left: 5,
			top: 10,
			right: 105,
			bottom: 110,
			width: 100,
			height: 100,
			toJSON: () => ({}),
		})

		const event = { clientX: 25, clientY: 30 } as ReactPointerEvent

		expect(getCanvasPoint(canvas, event)).toEqual({ x: 20, y: 20 })
	})
})

describe('configureStroke', () => {
	it('assigns stroke properties to the context', () => {
		const ctx = {
			lineCap: '',
			lineJoin: '',
			strokeStyle: '',
			lineWidth: 0,
		} as unknown as CanvasRenderingContext2D

		configureStroke(ctx, '#ff0000', 3)

		expect(ctx.lineCap).toBe('round')

		expect(ctx.lineJoin).toBe('round')

		expect(ctx.strokeStyle).toBe('#ff0000')

		expect(ctx.lineWidth).toBe(3)
	})
})

describe('drawSnapshot', () => {
	it('is a no-op when the canvas has no 2d context', () => {
		const canvas = document.createElement('canvas')

		canvas.getContext = () => null

		expect(() => drawSnapshot(canvas, 'data:,')).not.toThrow()
	})

	it('draws the loaded image onto the canvas at its CSS dimensions', () => {
		const canvas = document.createElement('canvas')

		const drawImage = vi.fn()

		canvas.getContext = (() =>
			({
				drawImage,
			}) as unknown as CanvasRenderingContext2D) as unknown as HTMLCanvasElement['getContext']

		canvas.getBoundingClientRect = () => ({ width: 200, height: 80 }) as DOMRect

		let captured: HTMLImageElement | null = null

		const Original = window.Image

		window.Image = class extends Original {
			constructor() {
				super()
				captured = this as unknown as HTMLImageElement
			}
		} as typeof Image

		drawSnapshot(canvas, 'data:,hello')

		window.Image = Original

		;(captured as HTMLImageElement | null)?.onload?.(new Event('load'))

		expect(drawImage).toHaveBeenCalled()
	})
})
