import type { ComponentType, ReactNode } from 'react'
import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Button } from '../../components/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogPanel,
} from '../../components/dialog'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerPanel,
} from '../../components/drawer'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetPanel } from '../../components/sheet'
import { allBySlot, bySlot, fireEvent, renderUI, screen, within } from '../helpers'

/** The elements of `elements` that the page shows, by their computed `display`. */
const shown = (elements: HTMLElement[]) =>
	elements.filter((element) => getComputedStyle(element).display !== 'none')

type PanelRootProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	footer?: ReactNode
	children: ReactNode
}

/** A root with its panel, as one component, so each case renders each family the same way. */
function composed(
	Root: ComponentType<{
		open: boolean
		onOpenChange: (open: boolean) => void
		children: ReactNode
	}>,
	Panel: ComponentType<{ footer?: ReactNode; children: ReactNode }>,
): ComponentType<PanelRootProps> {
	return function ComposedPanel({ open, onOpenChange, footer, children }: PanelRootProps) {
		return (
			<Root open={open} onOpenChange={onOpenChange}>
				<Panel footer={footer}>{children}</Panel>
			</Root>
		)
	}
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
		Root: composed(Dialog, DialogPanel),
		Close: DialogClose as Family['Close'],
		Content: DialogContent,
		Footer: DialogFooter,
	},
	{
		name: 'drawer',
		Root: composed(Drawer, DrawerPanel),
		Close: DrawerClose as Family['Close'],
		Content: DrawerContent,
		Footer: DrawerFooter,
	},
	{
		name: 'sheet',
		Root: composed(Sheet, SheetPanel),
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

		const footers = shown(allBySlot(document.body, `${name}-footer`))

		expect(footers).toHaveLength(1)

		expect(footers[0]).toContainElement(screen.getByRole('button', { name: 'Save' }))

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

	// The case the base style exists for: the server HTML holds the default footer
	// too, and no effect runs before the first paint to remove it.
	it('shows only the footer child in the server HTML', () => {
		const container = document.createElement('div')

		document.body.append(container)

		onTestFinished(() => container.remove())

		container.innerHTML = renderToString(
			<Root open onOpenChange={() => {}}>
				<Content>
					<Footer>
						<Button type="button">Save</Button>
					</Footer>
				</Content>
			</Root>,
		)

		const footers = shown(allBySlot(container, `${name}-footer`))

		expect(footers).toHaveLength(1)

		expect(footers[0]).toContainElement(within(container).getByRole('button', { name: 'Save' }))

		expect(within(container).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
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

	// A drawer can have a fixed height. Its content wrapper fills the panel, so a
	// footer in the wrapper stays at the foot. Dialog and sheet keep the shared wrapper.
	it(`${name === 'drawer' ? 'fills' : 'does not fill'} the panel with the content wrapper`, () => {
		renderUI(
			<Root open onOpenChange={() => {}}>
				<Content>Body</Content>
			</Root>,
		)

		const content = bySlot(document.body, `${name}-content`)

		if (name === 'drawer') expect(content).toHaveClass('flex-1')
		else expect(content).not.toHaveClass('flex-1')
	})
})
