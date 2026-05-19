import { describe, expect, it, vi } from 'vitest'
import { Collapse } from '../../components/collapse'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Collapse', () => {
	it('renders with data-slot="collapse"', () => {
		const { container } = renderUI(
			<Collapse trigger="Toggle">
				<p>Content</p>
			</Collapse>,
		)

		const el = bySlot(container, 'collapse')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders trigger', () => {
		renderUI(
			<Collapse trigger="Toggle">
				<p>Content</p>
			</Collapse>,
		)

		expect(screen.getByText('Toggle')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Collapse trigger="Toggle" className="custom">
				<p>Content</p>
			</Collapse>,
		)

		const el = bySlot(container, 'collapse')

		expect(el?.className).toContain('custom')
	})

	it('renders panel when open', () => {
		renderUI(
			<Collapse trigger="Toggle" defaultOpen>
				<p>Content</p>
			</Collapse>,
		)

		expect(screen.getByText('Content')).toBeInTheDocument()
	})

	it('toggles open state on trigger click', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Collapse trigger="Toggle" onOpenChange={onOpenChange}>
				<p>Content</p>
			</Collapse>,
		)

		fireEvent.click(screen.getByText('Toggle'))

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it('supports a controlled open state', () => {
		const { rerender } = renderUI(
			<Collapse open={false} trigger="Toggle">
				<p>Body</p>
			</Collapse>,
		)

		rerender(
			<Collapse open={true} trigger="Toggle">
				<p>Body</p>
			</Collapse>,
		)

		expect(screen.getByText('Body')).toBeInTheDocument()
	})

	it('renders without a built-in trigger when none is provided', () => {
		const { container } = renderUI(
			<Collapse defaultOpen>
				<p>Just body</p>
			</Collapse>,
		)

		expect(bySlot(container, 'collapse-trigger')).toBeNull()
		expect(screen.getByText('Just body')).toBeInTheDocument()
	})

	it('accepts a render-prop child for the trigger', () => {
		renderUI(
			<Collapse defaultOpen trigger={<span>Custom Trigger</span>}>
				<p>Body</p>
			</Collapse>,
		)

		expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
	})

	it('supports animate="slide"', () => {
		const { container } = renderUI(
			<Collapse animate="slide" trigger="Toggle" defaultOpen>
				<p>Body</p>
			</Collapse>,
		)

		expect(bySlot(container, 'collapse')).toBeInTheDocument()
	})

	it('supports animate={false}', () => {
		const { container } = renderUI(
			<Collapse animate={false} trigger="Toggle" defaultOpen>
				<p>Body</p>
			</Collapse>,
		)

		expect(bySlot(container, 'collapse')).toBeInTheDocument()
	})
})
