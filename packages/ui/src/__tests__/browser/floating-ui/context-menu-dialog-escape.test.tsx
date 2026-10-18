import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ContextMenu } from '../../../components/context-menu'
import { Dialog, DialogPanel } from '../../../components/dialog'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * An Escape in a context menu inside a Dialog (real floating engine, trusted
 * key).
 *
 * The panel closes the menu, and the press must stop there. A browser runs the
 * microtasks between two listeners of one trusted event. React commits the close
 * in a microtask, so the escape layer of the menu unregisters before the
 * document listener runs. The layer of the Dialog is then on top. Only
 * `preventDefault` from the panel tells that layer that the press is consumed.
 *
 * The jsdom suite cannot show this. Its synthetic dispatch runs no microtask
 * between two listeners, and it mocks `@floating-ui/react`.
 */
function Report({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
	const [open, setOpen] = useState(true)

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next)

				setOpen(next)
			}}
		>
			<DialogPanel aria-label="Report">
				<ContextMenu defaults={[{ key: 'copy', label: 'Copy', onAction: () => {} }]}>
					<div data-testid="surface" style={{ width: 200, height: 200 }}>
						Right-click me
					</div>
				</ContextMenu>
			</DialogPanel>
		</Dialog>
	)
}

describe('context menu Escape inside a Dialog (real browser)', () => {
	it('closes the menu and keeps the Dialog open', async () => {
		const onOpenChange = vi.fn()

		renderUI(<Report onOpenChange={onOpenChange} />)

		// The Dialog moves focus into itself one frame after it opens. A menu that opens
		// before then loses the focus to it, and no user can open one that soon.
		const dialog = await screen.findByRole('dialog')

		await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

		const surface = await screen.findByTestId('surface')

		const rect = surface.getBoundingClientRect()

		fireEvent.contextMenu(surface, { clientX: rect.left + 4, clientY: rect.top + 4 })

		const menu = await screen.findByRole('menu')

		await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

		expect(onOpenChange).not.toHaveBeenCalled()

		// The menu is closed now, so the next Escape goes to the Dialog.
		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
	})
})
