import { useRef } from 'react'
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

	it('moves focus to returnFocusTo when dismissed', () => {
		function Harness() {
			const triggerRef = useRef<HTMLButtonElement>(null)

			return (
				<>
					<button ref={triggerRef} type="button">
						Trigger
					</button>

					<Alert closable returnFocusTo={triggerRef}>
						content
					</Alert>
				</>
			)
		}

		renderUI(<Harness />)

		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

		// The dismiss button unmounts with the alert; focus lands on the caller's
		// element rather than falling to <body>.
		expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Trigger' })).toHaveFocus()
	})

	describe('status announcement', () => {
		const politeRegion = () =>
			document.body.querySelector('[data-slot="live-region"][aria-live="polite"]')

		it('announces an info alert through the polite live region when it appears', async () => {
			const { rerender } = renderUI(
				<Alert severity="info" open={false}>
					Saved
				</Alert>,
				{ announcer: true },
			)

			expect(politeRegion()?.textContent).toBe('')

			rerender(
				<Alert severity="info" open>
					Saved
				</Alert>,
			)

			await vi.waitFor(() => expect(politeRegion()).toHaveTextContent('Saved'))
		})

		it('stays silent for an alert already open on mount', async () => {
			renderUI(
				<Alert severity="success" open>
					Already here
				</Alert>,
				{ announcer: true },
			)

			// Flush the announcer's microtask, then confirm nothing was written.
			await Promise.resolve()

			expect(politeRegion()?.textContent).toBe('')
		})

		it('does not route warning/error through the announcer (role="alert" already announces)', async () => {
			const { rerender } = renderUI(
				<Alert severity="error" open={false}>
					Boom
				</Alert>,
				{ announcer: true },
			)

			rerender(
				<Alert severity="error" open>
					Boom
				</Alert>,
			)

			await Promise.resolve()

			expect(politeRegion()?.textContent).toBe('')
		})
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
