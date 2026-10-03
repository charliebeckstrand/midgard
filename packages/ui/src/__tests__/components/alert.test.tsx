import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from '../../components/alert'
import { Button } from '../../components/button'
import { bySlot, expectAnnouncement, fireEvent, liveRegion, renderUI, screen } from '../helpers'

describe('Alert', () => {
	it('renders the title in a div with no titleLevel, and as a heading with one', () => {
		renderUI(
			<>
				<Alert title="Plain" />
				<Alert severity="error" title="Payment failed" titleLevel={2} />
			</>,
		)

		expect(screen.getByText('Plain').tagName).toBe('DIV')

		expect(screen.getByRole('heading', { level: 2, name: 'Payment failed' })).toBeInTheDocument()
	})

	it('gives a button in its actions the soft variant in its own color', () => {
		renderUI(
			<>
				<Alert severity="warning" title="Title" actions={<Button>Action</Button>} />
				<Button variant="soft" color="amber">
					Reference
				</Button>
			</>,
		)

		const action = screen.getByRole('button', { name: 'Action' })

		expect(action).toHaveAttribute('data-variant', 'soft')

		expect(action.className).toBe(screen.getByRole('button', { name: 'Reference' }).className)
	})

	it('keeps the variant and color that a button in its actions gives', () => {
		renderUI(
			<Alert
				color="amber"
				title="Title"
				actions={
					<Button variant="outline" color="zinc">
						Action
					</Button>
				}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
	})

	it('renders title and description props', () => {
		renderUI(<Alert title="Title" description="Description" />)

		expect(screen.getByText('Title')).toBeInTheDocument()

		expect(screen.getByText('Description')).toBeInTheDocument()
	})

	it('wraps children in the body slot', () => {
		const { container } = renderUI(<Alert>plain text</Alert>)

		const body = bySlot(container, 'alert-body')

		expect(body).toBeInTheDocument()

		expect(body).toHaveTextContent('plain text')
	})

	it('renders no body slot for an empty child', () => {
		// The alert used to reconcile a slot trio against loose children by
		// sniffing each child's `displayName`. The title and description are props
		// alone now, so children are always the body and the sniffing is gone.
		const { container } = renderUI(<Alert title="Title">{null}</Alert>)

		expect(bySlot(container, 'alert-body')).not.toBeInTheDocument()
	})

	it('shows the severity icon only with a title', () => {
		const { container, rerender } = renderUI(<Alert severity="error">Boom</Alert>)

		expect(bySlot(container, 'icon')).not.toBeInTheDocument()

		rerender(<Alert severity="error" title="Boom" />)

		expect(bySlot(container, 'icon')).toBeInTheDocument()
	})

	it('shows an explicit icon without a title', () => {
		const { container } = renderUI(
			<Alert severity="error" icon={<svg />}>
				Boom
			</Alert>,
		)

		expect(bySlot(container, 'icon')).toBeInTheDocument()
	})

	it('dismisses when close button is clicked', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Alert closable onOpenChange={onOpenChange}>
				content
			</Alert>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('dismisses locally when controlled open has no onOpenChange', () => {
		// With a controlled `open` and no handler, setOpen can't notify the parent,
		// so the close button falls back to local dismissal rather than going inert.
		renderUI(
			<Alert open closable>
				content
			</Alert>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

		expect(screen.queryByText('content')).not.toBeInTheDocument()
	})

	it('re-shows after a local dismissal when the controlled open prop changes', () => {
		const { rerender } = renderUI(
			<Alert open closable>
				content
			</Alert>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

		expect(screen.queryByText('content')).not.toBeInTheDocument()

		rerender(
			<Alert open={false} closable>
				content
			</Alert>,
		)

		// The prop change supersedes the sticky local dismissal.
		rerender(
			<Alert open closable>
				content
			</Alert>,
		)

		expect(screen.getByText('content')).toBeInTheDocument()
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
		it('announces an info alert through the polite live region when it appears', async () => {
			const { rerender } = renderUI(
				<Alert severity="info" open={false}>
					Saved
				</Alert>,
			)

			// Lazily created on first announce; absent means nothing was announced.
			expect(liveRegion()?.textContent ?? '').toBe('')

			rerender(
				<Alert severity="info" open>
					Saved
				</Alert>,
			)

			await expectAnnouncement('Saved')
		})

		it('stays silent for an alert already open on mount', async () => {
			renderUI(
				<Alert severity="success" open>
					Already here
				</Alert>,
			)

			// Flush the announcer's microtask, then confirm nothing was written.
			await Promise.resolve()

			// Lazily created on first announce; absent means nothing was announced.
			expect(liveRegion()?.textContent ?? '').toBe('')
		})

		it('does not route warning/error through the announcer (role="alert" already announces)', async () => {
			const { rerender } = renderUI(
				<Alert severity="error" open={false}>
					Boom
				</Alert>,
			)

			rerender(
				<Alert severity="error" open>
					Boom
				</Alert>,
			)

			await Promise.resolve()

			// Lazily created on first announce; absent means nothing was announced.
			expect(liveRegion()?.textContent ?? '').toBe('')
		})
	})
})
