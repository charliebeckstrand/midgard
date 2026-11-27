import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Drawer, DrawerPanel, DrawerTrigger } from '../../../components/drawer'
import { renderUI, screen, waitFor } from '../../helpers'

/** A Drawer with a trigger, and a button in the panel that closes it, as a nav link does. */
function Navigation() {
	const [open, setOpen] = useState(false)

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger>
				<Button type="button">Menu</Button>
			</DrawerTrigger>
			<DrawerPanel aria-label="Navigation" footer={null}>
				<Button type="button" onClick={() => setOpen(false)}>
					Home
				</Button>
			</DrawerPanel>
		</Drawer>
	)
}

/**
 * The focus ring of the trigger when a modal overlay gives the focus back. After
 * a press of a pointer, the trigger gets the focus without a ring. WebKit shows
 * the ring for a focus from a script, also after a tap, so the call must ask for
 * no ring. After a key press, the ring shows.
 */
describe('Overlay return focus ring (real browser)', () => {
	it('gives the focus back without a ring after a pointer closes the overlay', async () => {
		renderUI(<Navigation />)

		const trigger = screen.getByRole('button', { name: 'Menu' })

		await userEvent.click(trigger)

		const home = await screen.findByRole('button', { name: 'Home' })

		const focus = vi.spyOn(trigger, 'focus')

		await userEvent.click(home)

		await waitFor(() => expect(document.activeElement).toBe(trigger))

		expect(focus).toHaveBeenCalledWith({ preventScroll: true, focusVisible: false })

		expect(trigger.matches(':focus-visible')).toBe(false)
	})

	it('gives the focus back with a ring after a key closes the overlay', async () => {
		renderUI(<Navigation />)

		const trigger = screen.getByRole('button', { name: 'Menu' })

		await userEvent.click(trigger)

		await screen.findByRole('dialog', { name: 'Navigation' })

		const focus = vi.spyOn(trigger, 'focus')

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(document.activeElement).toBe(trigger))

		expect(focus).toHaveBeenCalledWith({ preventScroll: true, focusVisible: undefined })

		expect(trigger.matches(':focus-visible')).toBe(true)
	})
})
