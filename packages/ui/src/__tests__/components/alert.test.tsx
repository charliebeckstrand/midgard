import { describe, expect, it, vi } from 'vitest'
import { Alert, AlertBody, AlertDescription, AlertTitle } from '../../components/alert'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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

	it('auto-wraps non-slot children in AlertBody', () => {
		const { container } = renderUI(<Alert>plain text</Alert>)

		const body = bySlot(container, 'alert-body')

		expect(body).toBeInTheDocument()

		expect(body).toHaveTextContent('plain text')
	})

	it('does not auto-wrap when children include a slot', () => {
		const { container } = renderUI(
			<Alert>
				<AlertTitle>Title</AlertTitle>
			</Alert>,
		)

		expect(bySlot(container, 'alert-body')).not.toBeInTheDocument()
	})

	it('dismisses when close button is clicked', () => {
		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Alert closable onOpenChange={onOpenChange}>
				content
			</Alert>,
		)

		const closeButton = container.querySelector('button')

		if (!closeButton) throw new Error('close button not rendered')

		fireEvent.click(closeButton)

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})

describe('AlertTitle', () => {
	it('renders with data-slot="alert-title"', () => {
		const { container } = renderUI(
			<Alert>
				<AlertTitle>My Title</AlertTitle>
			</Alert>,
		)

		expect(bySlot(container, 'alert-title')).toBeInTheDocument()
	})

	it('renders title content', () => {
		renderUI(
			<Alert>
				<AlertTitle>My Title</AlertTitle>
			</Alert>,
		)

		expect(screen.getByText('My Title')).toBeInTheDocument()
	})
})

describe('AlertBody', () => {
	it('renders with data-slot="alert-body"', () => {
		const { container } = renderUI(
			<Alert>
				<AlertBody>body</AlertBody>
			</Alert>,
		)

		expect(bySlot(container, 'alert-body')).toBeInTheDocument()
	})

	it('renders body content', () => {
		renderUI(
			<Alert>
				<AlertBody>My Body</AlertBody>
			</Alert>,
		)

		expect(screen.getByText('My Body')).toBeInTheDocument()
	})
})

describe('AlertDescription', () => {
	it('renders with data-slot="alert-description"', () => {
		const { container } = renderUI(
			<Alert>
				<AlertDescription>My Description</AlertDescription>
			</Alert>,
		)

		expect(bySlot(container, 'alert-description')).toBeInTheDocument()
	})

	it('renders description content', () => {
		renderUI(
			<Alert>
				<AlertDescription>My Description</AlertDescription>
			</Alert>,
		)

		expect(screen.getByText('My Description')).toBeInTheDocument()
	})
})
