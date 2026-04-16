import { describe, expect, it, vi } from 'vitest'
import { Alert, AlertDescription, AlertTitle } from '../../components/alert'
import { bySlot, renderUI, screen } from '../helpers'

describe('Alert', () => {
	it('renders with data-slot="alert"', () => {
		const { container } = renderUI(<Alert>content</Alert>)

		const el = bySlot(container, 'alert')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Alert>Hello</Alert>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Alert className="custom">content</Alert>)

		const el = bySlot(container, 'alert')

		expect(el?.className).toContain('custom')
	})

	it('renders title and description props', () => {
		renderUI(<Alert title="Title" description="Description" />)

		expect(screen.getByText('Title')).toBeInTheDocument()

		expect(screen.getByText('Description')).toBeInTheDocument()
	})

	it('dismisses when close button is clicked', () => {
		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Alert closable onOpenChange={onOpenChange}>
				content
			</Alert>,
		)

		const closeButton = container.querySelector('button')

		closeButton?.click()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})

describe('AlertTitle', () => {
	it('renders title content', () => {
		renderUI(
			<Alert>
				<AlertTitle>My Title</AlertTitle>
			</Alert>,
		)

		expect(screen.getByText('My Title')).toBeInTheDocument()
	})
})

describe('AlertDescription', () => {
	it('renders description content', () => {
		renderUI(
			<Alert>
				<AlertDescription>My Description</AlertDescription>
			</Alert>,
		)

		expect(screen.getByText('My Description')).toBeInTheDocument()
	})
})
