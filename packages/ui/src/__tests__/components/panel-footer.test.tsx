import type { ComponentType, ReactNode } from 'react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '../../components/dialog'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter } from '../../components/drawer'
import { Sheet, SheetClose, SheetContent, SheetFooter } from '../../components/sheet'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

type PanelRootProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	footer?: ReactNode
	children: ReactNode
}

type Family = {
	name: string
	Root: ComponentType<PanelRootProps>
	Close: ComponentType<{ children?: ReactNode }>
	Content: ComponentType<{ children?: ReactNode }>
	Footer: ComponentType<{ children?: ReactNode }>
}

const FAMILIES: Family[] = [
	{
		name: 'dialog',
		Root: Dialog,
		Close: DialogClose as Family['Close'],
		Content: DialogContent,
		Footer: DialogFooter,
	},
	{
		name: 'drawer',
		Root: Drawer,
		Close: DrawerClose as Family['Close'],
		Content: DrawerContent,
		Footer: DrawerFooter,
	},
	{
		name: 'sheet',
		Root: Sheet,
		Close: SheetClose as Family['Close'],
		Content: SheetContent,
		Footer: SheetFooter,
	},
]

describe.each(FAMILIES)('$name footer', ({ name, Root, Close, Content, Footer }) => {
	it('shows the standard Close button in a footer after the children', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Root open onOpenChange={onOpenChange}>
				<button type="button">First</button>
			</Root>,
		)

		const footer = bySlot(document.body, `${name}-footer`)

		const close = screen.getByRole('button', { name: 'Close' })

		expect(footer).toContainElement(close)

		expect(close).toHaveAttribute('data-slot', `${name}-close`)

		expect(close).toHaveAttribute('type', 'button')

		// The footer follows the children, so the first child keeps the first focus.
		expect(
			screen.getByRole('button', { name: 'First' }).compareDocumentPosition(close) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()

		fireEvent.click(close)

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('replaces the default footer with a footer child, also a nested one', () => {
		renderUI(
			<Root open onOpenChange={() => {}}>
				<Content>
					<Footer>
						<Button type="button">Save</Button>
					</Footer>
				</Content>
			</Root>,
		)

		expect(allBySlot(document.body, `${name}-footer`)).toHaveLength(1)

		expect(bySlot(document.body, `${name}-footer`)).toContainElement(
			screen.getByRole('button', { name: 'Save' }),
		)

		expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
	})

	it('brings the default footer back when the footer child unmounts', () => {
		function Toggle() {
			const [withFooter, setWithFooter] = useState(true)

			return (
				<Root open onOpenChange={() => {}}>
					<button type="button" onClick={() => setWithFooter(false)}>
						Drop footer
					</button>
					{withFooter ? <Footer>Custom</Footer> : null}
				</Root>
			)
		}

		renderUI(<Toggle />)

		expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Drop footer' }))

		expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
	})

	it('shows the footer prop as the content of the footer row', () => {
		renderUI(
			<Root
				open
				onOpenChange={() => {}}
				footer={
					<>
						<Button type="button">Help</Button>
						<Close />
					</>
				}
			>
				Body
			</Root>,
		)

		const footer = bySlot(document.body, `${name}-footer`)

		expect(footer).toContainElement(screen.getByRole('button', { name: 'Help' }))

		expect(footer).toContainElement(screen.getByRole('button', { name: 'Close' }))
	})

	it('shows no footer row when footer is null', () => {
		renderUI(
			<Root open onOpenChange={() => {}} footer={null}>
				Body
			</Root>,
		)

		expect(bySlot(document.body, `${name}-footer`)).not.toBeInTheDocument()

		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})
