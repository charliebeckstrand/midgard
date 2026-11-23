import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Dialog, DialogBody, DialogPanel, DialogTitle } from '../../../components/dialog'
import { Toast, ToastProvider, useToast } from '../../../components/toast'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * A modal Dialog hides the page from AT, but not the toast viewport, against
 * the real floating engine. The viewport mounts with no toast, so it is not a
 * live region when the Dialog opens. Without the `data-live-layer` mark, the
 * trap sets `aria-hidden` on it, and a `role="alert"` toast that comes later is
 * silent (WCAG 4.1.3).
 *
 * Only this project can assert it. The jsdom suite and the sibling `browser`
 * project mock `@floating-ui/react`, so nothing marks the page.
 */

/** A Dialog whose button raises an error toast. @internal */
function Page() {
	const { toast } = useToast()

	return (
		<>
			<Button>Outside</Button>
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel>
					<DialogTitle>Edit</DialogTitle>
					<DialogBody>
						<Button onClick={() => toast({ title: 'Failed to save', severity: 'error' })}>
							Save
						</Button>
					</DialogBody>
				</DialogPanel>
			</Dialog>
		</>
	)
}

describe('overlay live layer (real browser)', () => {
	it('keeps a toast raised in a modal Dialog in the accessibility tree', async () => {
		renderUI(
			<ToastProvider>
				<Page />
				<Toast />
			</ToastProvider>,
		)

		// Text query, not role: the trap marks the page `aria-hidden`.
		const outside = screen.getByText('Outside').closest('button') as HTMLElement

		await waitFor(() => expect(outside.closest('[aria-hidden="true"]')).not.toBeNull())

		await userEvent.click(screen.getByText('Save'))

		const alert = await screen.findByRole('alert')

		expect(alert).toHaveTextContent('Failed to save')

		expect(alert.closest('[aria-hidden="true"]')).toBeNull()
	})
})
