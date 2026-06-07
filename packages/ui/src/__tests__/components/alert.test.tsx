import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Alert, AlertTitle } from '../../components/alert'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Alert', () => {
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
			)

			// Lazily created on first announce — absent means nothing was announced.
			expect(politeRegion()?.textContent ?? '').toBe('')

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
			)

			// Flush the announcer's microtask, then confirm nothing was written.
			await Promise.resolve()

			// Lazily created on first announce — absent means nothing was announced.
			expect(politeRegion()?.textContent ?? '').toBe('')
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

			// Lazily created on first announce — absent means nothing was announced.
			expect(politeRegion()?.textContent ?? '').toBe('')
		})
	})
})
