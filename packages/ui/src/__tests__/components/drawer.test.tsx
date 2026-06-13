import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Drawer, DrawerClose, DrawerTrigger } from '../../components/drawer'
import { DensityProvider } from '../../providers/density'
import { fireEvent, renderUI, screen } from '../helpers'

describe('Drawer', () => {
	it('renders children with role="dialog" when open', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				Drawer content
			</Drawer>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')

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

	it('names a title-less drawer via the aria-label escape hatch', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} aria-label="Filters">
				content
			</Drawer>,
		)

		expect(screen.getByRole('dialog')).toHaveAccessibleName('Filters')
	})

	it('moves initial focus to the initialFocus element on open', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(
			<Drawer open onOpenChange={() => {}} initialFocus={ref}>
				<button type="button">First tabbable</button>
				<input ref={ref} aria-label="Composer" />
			</Drawer>,
		)

		expect(screen.getByLabelText('Composer')).toHaveFocus()
	})
})

describe('DrawerTrigger', () => {
	it('invokes the provided onClick when the child is clicked', () => {
		const onClick = vi.fn()

		renderUI(
			<DrawerTrigger onClick={onClick}>
				<button type="button">Open</button>
			</DrawerTrigger>,
		)

		fireEvent.click(screen.getByText('Open'))

		expect(onClick).toHaveBeenCalled()
	})

	it('calls the child existing onClick as well', () => {
		const childClick = vi.fn()

		renderUI(
			<DrawerTrigger>
				<button type="button" onClick={childClick}>
					Open
				</button>
			</DrawerTrigger>,
		)

		fireEvent.click(screen.getByText('Open'))

		expect(childClick).toHaveBeenCalled()
	})

	it('marks the trigger as a dialog disclosure', () => {
		renderUI(
			<DrawerTrigger open={false}>
				<button type="button">Open</button>
			</DrawerTrigger>,
		)

		const trigger = screen.getByText('Open')

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	})

	it('reflects the open state via aria-expanded', () => {
		renderUI(
			<DrawerTrigger open>
				<button type="button">Open</button>
			</DrawerTrigger>,
		)

		expect(screen.getByText('Open')).toHaveAttribute('aria-expanded', 'true')
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

	it('defaults to size="md" and exposes data-size on the panel', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-size', 'md')
	})

	it('reflects an explicit size prop on data-size', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} size="lg">
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-size', 'lg')
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

	it('inherits an ambient Density when no size prop is given', () => {
		renderUI(
			<DensityProvider density="compact">
				<Drawer open onOpenChange={() => {}}>
					content
				</Drawer>
			</DensityProvider>,
		)

		expect(drawerPanel()).toHaveAttribute('data-size', 'sm')
	})

	it('explicit size prop wins over an ambient Density', () => {
		renderUI(
			<DensityProvider density="compact">
				<Drawer open onOpenChange={() => {}} size="lg">
					content
				</Drawer>
			</DensityProvider>,
		)

		expect(drawerPanel()).toHaveAttribute('data-size', 'lg')
	})
})

describe('Drawer uncontrolled', () => {
	it('opens from defaultOpen', () => {
		renderUI(<Drawer defaultOpen>Drawer body</Drawer>)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByText('Drawer body')).toBeInTheDocument()
	})

	it('stays closed with neither open nor defaultOpen', () => {
		renderUI(<Drawer>Hidden</Drawer>)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('closes itself when uncontrolled and a DrawerClose is activated', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Drawer defaultOpen onOpenChange={onOpenChange}>
				<DrawerClose>
					<button type="button">Done</button>
				</DrawerClose>
			</Drawer>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Done'))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
