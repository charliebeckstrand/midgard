import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Drawer, DrawerClose, DrawerOpen } from '../../components/drawer'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Drawer', () => {
	it('renders with role="dialog" when open', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				content
			</Drawer>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')
	})

	it('renders children when open', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				Drawer content
			</Drawer>,
		)

		expect(screen.getByText('Drawer content')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<Drawer open={false} onOpenChange={() => {}}>
				Hidden
			</Drawer>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})

describe('DrawerOpen', () => {
	it('invokes the provided onClick when the child is clicked', () => {
		const onClick = vi.fn()

		renderUI(
			<DrawerOpen onClick={onClick}>
				<button type="button">Open</button>
			</DrawerOpen>,
		)

		fireEvent.click(screen.getByText('Open'))

		expect(onClick).toHaveBeenCalled()
	})

	it('calls the child existing onClick as well', () => {
		const childClick = vi.fn()

		renderUI(
			<DrawerOpen>
				<button type="button" onClick={childClick}>
					Open
				</button>
			</DrawerOpen>,
		)

		fireEvent.click(screen.getByText('Open'))

		expect(childClick).toHaveBeenCalled()
	})
})

describe('DrawerClose', () => {
	it('closes the drawer when the child is clicked', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Drawer open onOpenChange={onOpenChange}>
				<DrawerClose>
					<button type="button">Close</button>
				</DrawerClose>
			</Drawer>,
		)

		fireEvent.click(screen.getByText('Close'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('calls the child existing onClick before closing', () => {
		const childClick = vi.fn()

		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerClose>
					<button type="button" onClick={childClick}>
						Close
					</button>
				</DrawerClose>
			</Drawer>,
		)

		fireEvent.click(screen.getByText('Close'))

		expect(childClick).toHaveBeenCalled()
	})
})

describe('Drawer size context', () => {
	// Drawer panels render through Overlay's portal, so they live on
	// document.body rather than under the test container.
	const drawerPanel = () => document.querySelector<HTMLElement>('[data-slot="drawer"]')
	const buttonInDrawer = () => document.querySelector<HTMLElement>('[data-slot="button"]')

	it('defaults to size="md" and exposes data-step on the panel', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-step', 'md')
	})

	it('reflects an explicit size prop on data-step', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} size="lg">
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-step', 'lg')
	})

	it('descendant Buttons inherit the Drawer size', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} size="lg">
				<Button>Save</Button>
			</Drawer>,
		)

		// sun.lg.text = 'lg' → ji.size.lg = 'text-lg'
		expect(buttonInDrawer()?.className).toContain('text-lg')
	})
})
