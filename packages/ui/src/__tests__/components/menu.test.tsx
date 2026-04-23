import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@floating-ui/react', () => {
	const noop = () => {}
	const identity = <T,>(x: T) => x

	return {
		autoUpdate: noop,
		FloatingPortal: ({ children }: { children: ReactNode }) => children,
		flip: () => ({}),
		offset: () => ({}),
		shift: () => ({}),
		size: () => ({}),
		useClick: () => ({}),
		useClientPoint: () => ({}),
		useDismiss: () => ({}),
		useFloating: () => ({
			refs: {
				setReference: noop,
				setFloating: noop,
				reference: { current: null },
				floating: { current: null },
			},
			floatingStyles: {},
			context: {},
			x: 0,
			y: 0,
			strategy: 'absolute',
			placement: 'bottom',
			middlewareData: {},
			isPositioned: true,
			update: noop,
		}),
		useInteractions: () => ({
			getReferenceProps: identity,
			getFloatingProps: identity,
			getItemProps: identity,
		}),
		useRole: () => ({}),
	}
})

import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuHeading,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuShortcut,
	MenuTrigger,
} from '../../components/menu'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Menu', () => {
	it('renders with data-slot="menu"', () => {
		const { container } = renderUI(
			<Menu>
				<MenuTrigger>
					<button type="button">Open</button>
				</MenuTrigger>
			</Menu>,
		)

		const el = bySlot(container, 'menu')

		expect(el).toBeInTheDocument()
	})

	it('renders trigger content', () => {
		renderUI(
			<Menu>
				<MenuTrigger>
					<button type="button">Open Menu</button>
				</MenuTrigger>
			</Menu>,
		)

		expect(screen.getByText('Open Menu')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Menu className="custom">
				<MenuTrigger>
					<button type="button">Open</button>
				</MenuTrigger>
			</Menu>,
		)

		const el = bySlot(container, 'menu')

		expect(el?.className).toContain('custom')
	})
})

describe('MenuSection', () => {
	it('renders with data-slot="menu-section"', () => {
		const { container } = renderUI(<MenuSection>content</MenuSection>)

		const el = bySlot(container, 'menu-section')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('FIELDSET')
	})

	it('renders children', () => {
		renderUI(<MenuSection>Section content</MenuSection>)

		expect(screen.getByText('Section content')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<MenuSection className="custom">content</MenuSection>)

		const el = bySlot(container, 'menu-section')

		expect(el?.className).toContain('custom')
	})
})

describe('MenuHeading', () => {
	it('renders with data-slot="menu-heading"', () => {
		const { container } = renderUI(<MenuHeading>Heading</MenuHeading>)

		const el = bySlot(container, 'menu-heading')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('LEGEND')
	})

	it('renders children', () => {
		renderUI(<MenuHeading>Heading text</MenuHeading>)

		expect(screen.getByText('Heading text')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<MenuHeading className="custom">content</MenuHeading>)

		const el = bySlot(container, 'menu-heading')

		expect(el?.className).toContain('custom')
	})
})

describe('MenuSeparator', () => {
	it('renders with data-slot="menu-separator"', () => {
		const { container } = renderUI(<MenuSeparator />)

		const el = bySlot(container, 'menu-separator')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('HR')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<MenuSeparator className="custom" />)

		const el = bySlot(container, 'menu-separator')

		expect(el?.className).toContain('custom')
	})
})

describe('MenuTrigger', () => {
	it('clones a single child element with data-slot="menu-trigger"', () => {
		renderUI(
			<Menu>
				<MenuTrigger>
					<button type="button">Open</button>
				</MenuTrigger>
			</Menu>,
		)

		const trigger = screen.getByText('Open')

		expect(trigger).toHaveAttribute('data-slot', 'menu-trigger')

		expect(trigger).toHaveAttribute('aria-haspopup', 'menu')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	})

	it('toggles open state when the cloned child is clicked', () => {
		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<button type="button">Open</button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const trigger = screen.getByText('Open')

		fireEvent.click(trigger)

		expect(trigger).toHaveAttribute('aria-expanded', 'true')
	})

	it('calls the child onClick when present', () => {
		const onClick = vi.fn()

		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<button type="button" onClick={onClick}>
						Open
					</button>
				</MenuTrigger>
			</Menu>,
		)

		fireEvent.click(screen.getByText('Open'))

		expect(onClick).toHaveBeenCalled()
	})
})

describe('MenuContent', () => {
	it('renders static popover content with role="menu" when defaultOpen and no placement', () => {
		const { container } = renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const menu = container.querySelector('[role="menu"]')

		expect(menu).toBeInTheDocument()
	})

	it('renders portal content when placement is provided and menu is open', () => {
		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<button type="button">Open</button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		fireEvent.click(screen.getByText('Open'))

		expect(screen.getByText('Item')).toBeInTheDocument()
	})
})

describe('MenuItem', () => {
	it('renders as a button by default with data-slot="menu-item"', () => {
		const { container } = renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const item = bySlot(container, 'menu-item')

		expect(item?.tagName).toBe('BUTTON')

		expect(item).toHaveAttribute('role', 'menuitem')
	})

	it('renders as a link when href is provided', () => {
		const { container } = renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem href="/docs">Docs</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const item = bySlot(container, 'menu-item')

		expect(item?.tagName).toBe('A')

		expect(item).toHaveAttribute('href', '/docs')
	})

	it('calls onAction when clicked', () => {
		const onAction = vi.fn()

		renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem onAction={onAction}>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		fireEvent.click(screen.getByText('Item'))

		expect(onAction).toHaveBeenCalled()
	})

	it('does not call onAction when disabled', () => {
		const onAction = vi.fn()

		renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem disabled onAction={onAction}>
						Item
					</MenuItem>
				</MenuContent>
			</Menu>,
		)

		fireEvent.click(screen.getByText('Item'))

		expect(onAction).not.toHaveBeenCalled()
	})

	it('sets data-disabled when disabled', () => {
		const { container } = renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem disabled>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const item = bySlot(container, 'menu-item')

		expect(item).toHaveAttribute('data-disabled')

		expect(item).toHaveAttribute('aria-disabled', 'true')
	})

	it('invokes onAction when Enter is pressed', () => {
		const onAction = vi.fn()

		renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem onAction={onAction}>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		fireEvent.keyDown(screen.getByText('Item'), { key: 'Enter' })

		expect(onAction).toHaveBeenCalled()
	})

	it('invokes onAction when Space is pressed', () => {
		const onAction = vi.fn()

		renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem onAction={onAction}>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		fireEvent.keyDown(screen.getByText('Item'), { key: ' ' })

		expect(onAction).toHaveBeenCalled()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem className="custom">Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		expect(bySlot(container, 'menu-item')?.className).toContain('custom')
	})
})

describe('MenuLabel / MenuDescription / MenuShortcut', () => {
	it('renders MenuLabel with data-slot="menu-label"', () => {
		const { container } = renderUI(<MenuLabel>Label</MenuLabel>)

		expect(bySlot(container, 'menu-label')).toHaveTextContent('Label')
	})

	it('renders MenuDescription with data-slot="menu-description"', () => {
		const { container } = renderUI(<MenuDescription>Info</MenuDescription>)

		expect(bySlot(container, 'menu-description')).toHaveTextContent('Info')
	})

	it('renders MenuShortcut with data-slot="menu-shortcut"', () => {
		const { container } = renderUI(<MenuShortcut>⌘K</MenuShortcut>)

		expect(bySlot(container, 'menu-shortcut')).toBeInTheDocument()
	})
})
