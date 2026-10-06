import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { Drawer, DrawerBody, DrawerPanel } from '../../../components/drawer'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * An Escape on the open panel of a Combobox inside a Drawer (real floating
 * engine, trusted key).
 *
 * The input closes the panel, and the press must stop there. A browser runs the
 * microtasks between two listeners of one trusted event. React commits the close
 * in a microtask, so the escape layer of the panel unregisters before the
 * document listener runs. The layer of the Drawer is then on top. Only
 * `preventDefault` from the input tells that layer that the press is consumed.
 *
 * The jsdom suite cannot show this. Its synthetic dispatch runs no microtask
 * between two listeners, and it mocks `@floating-ui/react`.
 */
function PlaceForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
	const [open, setOpen] = useState(true)

	return (
		<Drawer
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next)

				setOpen(next)
			}}
		>
			<DrawerPanel aria-label="Place">
				<DrawerBody>
					<Combobox<string> displayValue={(v) => v} placeholder="Search">
						<ComboboxOption value="apple">
							<ComboboxLabel>Apple</ComboboxLabel>
						</ComboboxOption>
						<ComboboxOption value="apricot">
							<ComboboxLabel>Apricot</ComboboxLabel>
						</ComboboxOption>
					</Combobox>
				</DrawerBody>
			</DrawerPanel>
		</Drawer>
	)
}

describe('Combobox Escape inside a Drawer (real browser)', () => {
	it('closes the panel and keeps the Drawer open', async () => {
		const onOpenChange = vi.fn()

		renderUI(<PlaceForm onOpenChange={onOpenChange} />)

		await userEvent.click(await screen.findByRole('combobox'))

		await screen.findByRole('listbox')

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		expect(onOpenChange).not.toHaveBeenCalled()

		// The panel is closed now, so the next Escape goes to the Drawer.
		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
	})
})
