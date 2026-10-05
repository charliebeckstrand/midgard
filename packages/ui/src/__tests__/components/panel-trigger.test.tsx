import type { ComponentType, ReactNode } from 'react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Dialog, DialogClose, DialogPanel, DialogTrigger } from '../../components/dialog'
import { Drawer, DrawerClose, DrawerPanel, DrawerTrigger } from '../../components/drawer'
import { Sheet, SheetClose, SheetPanel, SheetTrigger } from '../../components/sheet'
import { fireEvent, getSlot, renderUI, screen, setupUser, waitFor } from '../helpers'

type RootProps = {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	children: ReactNode
}

type Family = {
	name: string
	Root: ComponentType<RootProps>
	Panel: ComponentType<{ 'aria-label'?: string; footer?: ReactNode; children: ReactNode }>
	Trigger: ComponentType<{ children: ReactNode }>
	Close: ComponentType<{ children?: ReactNode }>
}

const FAMILIES: Family[] = [
	{
		name: 'dialog',
		Root: Dialog,
		Panel: DialogPanel,
		Trigger: DialogTrigger,
		Close: DialogClose as Family['Close'],
	},
	{
		name: 'drawer',
		Root: Drawer,
		Panel: DrawerPanel,
		Trigger: DrawerTrigger,
		Close: DrawerClose as Family['Close'],
	},
	{
		name: 'sheet',
		Root: Sheet,
		Panel: SheetPanel,
		Trigger: SheetTrigger,
		Close: SheetClose as Family['Close'],
	},
]

describe.each(FAMILIES)('$name trigger', ({ Root, Panel, Trigger, Close }) => {
	/** An uncontrolled panel with a trigger, and a close part in the panel. */
	function uncontrolled(onOpenChange?: (open: boolean) => void) {
		return (
			<Root onOpenChange={onOpenChange}>
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

	it('opens an uncontrolled panel from the trigger', async () => {
		const onOpenChange = vi.fn()

		const user = setupUser()

		renderUI(uncontrolled(onOpenChange))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Open' }))

		expect(screen.getByRole('dialog', { name: 'Panel' })).toBeInTheDocument()

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it('sets aria-expanded and aria-controls from the open state', async () => {
		const user = setupUser()

		renderUI(uncontrolled())

		const trigger = screen.getByRole('button', { name: 'Open' })

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		expect(trigger).not.toHaveAttribute('aria-controls')

		await user.click(trigger)

		expect(trigger).toHaveAttribute('aria-expanded', 'true')

		expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('dialog').id)

		await user.click(screen.getByRole('button', { name: 'Done' }))

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		expect(trigger).not.toHaveAttribute('aria-controls')
	})

	it('closes an uncontrolled panel from its close part', async () => {
		const user = setupUser()

		renderUI(uncontrolled())

		await user.click(screen.getByRole('button', { name: 'Open' }))

		await user.click(screen.getByRole('button', { name: 'Done' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})

	it('closes an uncontrolled panel from Escape', async () => {
		const user = setupUser()

		renderUI(uncontrolled())

		await user.click(screen.getByRole('button', { name: 'Open' }))

		await user.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})

	it('closes an uncontrolled panel from the backdrop', async () => {
		const user = setupUser()

		renderUI(uncontrolled())

		await user.click(screen.getByRole('button', { name: 'Open' }))

		fireEvent.click(getSlot(document.body, 'overlay-backdrop'))

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})

	it('runs the own onClick of the child before it opens the panel', async () => {
		const childClick = vi.fn()

		const user = setupUser()

		renderUI(
			<Root>
				<Trigger>
					<Button type="button" onClick={childClick}>
						Open
					</Button>
				</Trigger>
				<Panel aria-label="Panel">Body</Panel>
			</Root>,
		)

		await user.click(screen.getByRole('button', { name: 'Open' }))

		expect(childClick).toHaveBeenCalledOnce()

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	it('renders its own button for a non-element child', async () => {
		const user = setupUser()

		renderUI(
			<Root>
				<Trigger>Open</Trigger>
				<Panel aria-label="Panel">Body</Panel>
			</Root>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		expect(trigger).toHaveAttribute('type', 'button')

		await user.click(trigger)

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	it('keeps the controlled mode: the trigger asks, and the owner decides', async () => {
		const onOpenChange = vi.fn()

		const user = setupUser()

		const { rerender } = renderUI(
			<Root open={false} onOpenChange={onOpenChange}>
				<Trigger>
					<Button type="button">Open</Button>
				</Trigger>
				<Panel aria-label="Panel">Body</Panel>
			</Root>,
		)

		await user.click(screen.getByRole('button', { name: 'Open' }))

		expect(onOpenChange).toHaveBeenCalledWith(true)

		// The owner has not set `open`, so the panel stays shut.
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		rerender(
			<Root open onOpenChange={onOpenChange}>
				<Trigger>
					<Button type="button">Open</Button>
				</Trigger>
				<Panel aria-label="Panel">Body</Panel>
			</Root>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Open', hidden: true })).toHaveAttribute(
			'aria-expanded',
			'true',
		)
	})

	it('drives a controlled panel through the owner state', async () => {
		function Controlled() {
			const [open, setOpen] = useState(false)

			return (
				<>
					<Root open={open} onOpenChange={setOpen}>
						<Trigger>
							<Button type="button">Open</Button>
						</Trigger>
						<Panel aria-label="Panel">Body</Panel>
					</Root>
					<output data-testid="state">{String(open)}</output>
				</>
			)
		}

		const user = setupUser()

		renderUI(<Controlled />)

		await user.click(screen.getByRole('button', { name: 'Open' }))

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(
			screen.getByTestId('state', { suppressHydrationWarning: true } as never),
		).toHaveTextContent('true')

		await user.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})

	it('throws outside the root', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() =>
			renderUI(
				<Trigger>
					<Button type="button">Open</Button>
				</Trigger>,
			),
		).toThrow('A panel trigger or panel must be rendered inside a Dialog, Sheet, or Drawer')
	})
})
