import type { PointerEvent as ReactPointerEvent } from 'react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { Description, Message } from '../../components/fieldset'
import { SignaturePad, type SignaturePadHandle } from '../../components/signature-pad'
import {
	configureStroke,
	drawSnapshot,
	getCanvasPoint,
} from '../../components/signature-pad/signature-pad-utilities'
import {
	bySlot,
	expectSlot,
	fireEvent,
	makeCanvasContext,
	renderUI,
	screen,
	userEvent,
} from '../helpers'

describe('SignaturePad', () => {
	it('renders the canvas slot', () => {
		const { container } = renderUI(<SignaturePad />)

		expectSlot(container, 'signature-pad-canvas', 'canvas')
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

	it('renders the clear action for a non-empty pad and clears on click', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<SignaturePad value="data:image/png;base64,AAAA" onValueChange={onChange} />,
		)

		const clearButton = bySlot(container, 'signature-pad-clear') as HTMLElement

		expect(clearButton).toBeInTheDocument()

		// pointerdown is swallowed so it doesn't start a stroke on the canvas underneath.
		fireEvent.pointerDown(clearButton)

		fireEvent.click(clearButton)

		expect(onChange).toHaveBeenCalledWith(null)
	})

	it('returns focus to the canvas after clearing', async () => {
		const { container } = renderUI(<SignaturePad defaultValue="data:image/png;base64,AAAA" />)

		const canvas = bySlot(container, 'signature-pad-canvas') as HTMLElement

		const user = userEvent.setup()

		await user.click(bySlot(container, 'signature-pad-clear') as HTMLElement)

		// The clear button unmounts once the pad is empty; focus must return to the
		// canvas rather than falling to <body>.
		expect(bySlot(container, 'signature-pad-clear')).not.toBeInTheDocument()

		expect(canvas).toHaveFocus()
	})

	it('omits the clear action when readOnly even with a value', () => {
		const { container } = renderUI(<SignaturePad readOnly value="data:image/png;base64,AAAA" />)

		expect(bySlot(container, 'signature-pad-clear')).not.toBeInTheDocument()
	})

	it('names the canvas as an image and conveys its empty state', () => {
		const { container } = renderUI(<SignaturePad aria-label="Customer signature" />)

		const canvas = bySlot(container, 'signature-pad-canvas')

		// role="img" on canvas: a bare <canvas> has no implicit role, so aria-label
		// requires an explicit role to be honored by assistive tech.
		expect(canvas).toHaveAttribute('role', 'img')

		expect(canvas).toHaveAttribute('aria-label', 'Customer signature, empty')
	})
})

describe('getCanvasPoint', () => {
	it('returns null when the canvas is missing', () => {
		const event = { clientX: 10, clientY: 20 } as ReactPointerEvent

		expect(getCanvasPoint(null, event)).toBeNull()
	})

	it('returns a canvas-relative point when the canvas is provided', () => {
		const canvas = document.createElement('canvas')

		canvas.getBoundingClientRect = () => DOMRect.fromRect({ x: 5, y: 10, width: 100, height: 100 })

		const event = { clientX: 25, clientY: 30 } as ReactPointerEvent

		expect(getCanvasPoint(canvas, event)).toEqual({ x: 20, y: 20 })
	})
})

describe('configureStroke', () => {
	it('assigns stroke properties to the context', () => {
		const context = makeCanvasContext()

		configureStroke(context, '#ff0000', 3)

		expect(context.lineCap).toBe('round')

		expect(context.lineJoin).toBe('round')

		expect(context.strokeStyle).toBe('#ff0000')

		expect(context.lineWidth).toBe(3)
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

		vi.spyOn(canvas, 'getContext').mockReturnValue(makeCanvasContext({ drawImage }))

		canvas.getBoundingClientRect = () => DOMRect.fromRect({ width: 200, height: 80 })

		let captured: HTMLImageElement | null = null

		const Original = window.Image

		window.Image = class extends Original {
			constructor() {
				super()
				captured = this
			}
		} as typeof Image

		try {
			drawSnapshot(canvas, 'data:,hello')
		} finally {
			window.Image = Original
		}

		;(captured as HTMLImageElement | null)?.onload?.(new Event('load'))

		expect(drawImage).toHaveBeenCalled()
	})
})

describe('SignaturePad + Control', () => {
	it('surfaces invalid state from an enclosing Control onto the canvas', () => {
		const { container } = renderUI(
			<Control invalid>
				<SignaturePad />
			</Control>,
		)

		const canvas = bySlot(container, 'signature-pad-canvas')

		expect(canvas).toHaveAttribute('aria-invalid', 'true')

		expect(canvas).toHaveAttribute('data-invalid')
	})

	it('points the canvas aria-describedby at the control description and message', () => {
		const { container } = renderUI(
			<Control id="sig" invalid>
				<Description>Sign above the line</Description>
				<SignaturePad />
				<Message>Signature required</Message>
			</Control>,
		)

		const describedBy = bySlot(container, 'signature-pad-canvas')?.getAttribute('aria-describedby')

		expect(describedBy).toContain('sig-description')

		expect(describedBy).toContain('sig-error')
	})
})
