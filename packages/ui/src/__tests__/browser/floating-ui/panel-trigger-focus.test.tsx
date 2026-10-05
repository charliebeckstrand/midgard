import type { ComponentType, ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Dialog, DialogClose, DialogPanel, DialogTrigger } from '../../../components/dialog'
import { Drawer, DrawerClose, DrawerPanel, DrawerTrigger } from '../../../components/drawer'
import { Sheet, SheetClose, SheetPanel, SheetTrigger } from '../../../components/sheet'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'

type Family = {
	name: string
	Root: ComponentType<{ children: ReactNode }>
	Panel: ComponentType<{ 'aria-label'?: string; footer?: ReactNode; children: ReactNode }>
	Trigger: ComponentType<{ children: ReactNode }>
	Close: ComponentType<{ children?: ReactNode }>
}

const FAMILIES: Family[] = [
	{
		name: 'Dialog',
		Root: Dialog,
		Panel: DialogPanel,
		Trigger: DialogTrigger,
		Close: DialogClose as Family['Close'],
	},
	{
		name: 'Drawer',
		Root: Drawer,
		Panel: DrawerPanel,
		Trigger: DrawerTrigger,
		Close: DrawerClose as Family['Close'],
	},
	{
		name: 'Sheet',
		Root: Sheet,
		Panel: SheetPanel,
		Trigger: SheetTrigger,
		Close: SheetClose as Family['Close'],
	},
]

/**
 * An uncontrolled panel opens from its trigger, and each way out gives focus back
 * to the trigger. Real focus movement needs the live focus manager, so this runs
 * in the browser suite.
 */
describe.each(FAMILIES)('$name trigger (real focus manager)', ({ Root, Panel, Trigger, Close }) => {
	function tree() {
		return (
			<Root>
				<Trigger>
					<Button type="button">Open</Button>
				</Trigger>
				<Panel aria-label="Panel" footer={null}>
					<Close>
						<Button type="button">Done</Button>
					</Close>
				</Panel>
			</Root>
		)
	}

	/** Opens the panel from its trigger, and waits for focus to move into the panel. */
	async function open() {
		renderUI(tree())

		const trigger = screen.getByRole('button', { name: 'Open' })

		await userEvent.click(trigger)

		const panel = await screen.findByRole('dialog', { name: 'Panel' })

		await waitFor(() => expect(panel).toContainElement(document.activeElement as HTMLElement))

		expect(trigger).toHaveAttribute('aria-expanded', 'true')

		return trigger
	}

	/** The panel closes, and the trigger has the focus again. */
	async function expectClosed(trigger: HTMLElement) {
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

			expect(trigger).toHaveFocus()
		})

		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	}

	it('gives focus back to the trigger after Escape', async () => {
		const trigger = await open()

		await userEvent.keyboard('{Escape}')

		await expectClosed(trigger)
	})

	it('gives focus back to the trigger after a click on the backdrop', async () => {
		const trigger = await open()

		// A sheet covers the whole width of a narrow viewport, so no point of the backdrop
		// is free for a pointer. The click goes to the backdrop element directly.
		getSlot(document.body, 'overlay-backdrop').click()

		await expectClosed(trigger)
	})

	it('gives focus back to the trigger after the close part', async () => {
		const trigger = await open()

		await userEvent.click(screen.getByRole('button', { name: 'Done' }))

		await expectClosed(trigger)
	})
})
