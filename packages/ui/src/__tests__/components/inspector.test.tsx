import { describe, expect, it, vi } from 'vitest'
import {
	Inspector,
	InspectorBody,
	InspectorClose,
	InspectorDescription,
	InspectorTitle,
} from '../../components/inspector'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('Inspector', () => {
	it('renders with data-slot="inspector" when open', () => {
		const { container } = renderUI(
			<Inspector open onOpenChange={() => {}}>
				content
			</Inspector>,
		)

		const el = bySlot(container, 'inspector')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('ASIDE')
	})

	it('renders children when open', () => {
		renderUI(
			<Inspector open onOpenChange={() => {}}>
				Inspector content
			</Inspector>,
		)

		expect(screen.getByText('Inspector content')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		const { container } = renderUI(
			<Inspector open={false} onOpenChange={() => {}}>
				Hidden
			</Inspector>,
		)

		expect(bySlot(container, 'inspector')).not.toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Inspector open onOpenChange={() => {}} className="custom">
				content
			</Inspector>,
		)

		const el = bySlot(container, 'inspector')

		expect(el?.className).toContain('custom')
	})

	it('associates aria-labelledby with the title', () => {
		const { container } = renderUI(
			<Inspector open onOpenChange={() => {}}>
				<InspectorTitle>Load details</InspectorTitle>
			</Inspector>,
		)

		const el = bySlot(container, 'inspector')

		const titleId = el?.getAttribute('aria-labelledby')

		expect(titleId).toBeTruthy()

		expect(document.getElementById(titleId as string)).toHaveTextContent('Load details')
	})

	it('associates aria-describedby when a description is rendered', () => {
		const { container } = renderUI(
			<Inspector open onOpenChange={() => {}}>
				<InspectorTitle>Load details</InspectorTitle>
				<InspectorDescription>Tendered to Acme Freight.</InspectorDescription>
			</Inspector>,
		)

		const el = bySlot(container, 'inspector')

		const descId = el?.getAttribute('aria-describedby')

		expect(descId).toBeTruthy()

		expect(document.getElementById(descId as string)).toHaveTextContent('Tendered to Acme Freight.')
	})

	it('omits aria-describedby when no description is rendered', () => {
		const { container } = renderUI(
			<Inspector open onOpenChange={() => {}}>
				<InspectorTitle>Load</InspectorTitle>
			</Inspector>,
		)

		const el = bySlot(container, 'inspector')

		expect(el).not.toHaveAttribute('aria-describedby')
	})

	it('renders InspectorBody with data-slot="inspector-body"', () => {
		const { container } = renderUI(
			<Inspector open onOpenChange={() => {}}>
				<InspectorBody>Body</InspectorBody>
			</Inspector>,
		)

		expect(bySlot(container, 'inspector-body')).toBeInTheDocument()
	})

	it('calls onOpenChange(false) when InspectorClose is clicked', async () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Inspector open onOpenChange={onOpenChange}>
				<InspectorClose />
			</Inspector>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Close inspector'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
