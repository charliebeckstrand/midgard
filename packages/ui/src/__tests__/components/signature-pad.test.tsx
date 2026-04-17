import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { SignaturePad, type SignaturePadHandle } from '../../components/signature-pad'
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
