import { describe, expect, it, vi } from 'vitest'

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
import { useMenuContext } from '../../components/menu/context'
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

	it('closes the menu when Escape is pressed on the menu panel', () => {
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

		fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

		expect(screen.queryByText('Item')).not.toBeInTheDocument()
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

	it('ignores non-Enter/Space keys', () => {
		const onAction = vi.fn()

		renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem onAction={onAction}>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		fireEvent.keyDown(screen.getByText('Item'), { key: 'ArrowDown' })

		expect(onAction).not.toHaveBeenCalled()
	})

	it('marks data-disabled on the href variant when disabled', () => {
		renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem href="/about" disabled>
						About
					</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const item = screen.getByText('About').closest('[role="menuitem"]') as HTMLElement

		expect(item).toHaveAttribute('data-disabled')

		expect(item.tagName).toBe('A')
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

describe('MenuTrigger fallback button', () => {
	it('renders a plain button when children is not a React element', () => {
		const { container } = renderUI(
			<Menu>
				<MenuTrigger>Open</MenuTrigger>
			</Menu>,
		)

		const trigger = bySlot(container, 'menu-trigger')

		expect(trigger?.tagName).toBe('BUTTON')

		expect(trigger).toHaveTextContent('Open')

		expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
	})

	it('toggles open state when the fallback button is clicked', () => {
		const { container } = renderUI(
			<Menu>
				<MenuTrigger>Open</MenuTrigger>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const trigger = bySlot(container, 'menu-trigger') as HTMLElement

		fireEvent.click(trigger)

		expect(trigger).toHaveAttribute('aria-expanded', 'true')
	})
})

describe('Menu context-menu mode', () => {
	it('opens the menu in response to a contextmenu event when no placement is set', () => {
		const { container } = renderUI(
			<Menu>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const root = bySlot(container, 'menu') as HTMLElement

		// Without a placement prop the root wrapper opts into context-menu mode.
		expect(root).toHaveAttribute('role', 'application')

		fireEvent.contextMenu(root, { clientX: 50, clientY: 80 })

		// After a context-menu open, the menu surface is rendered with role="menu".
		expect(container.querySelector('[role="menu"]')).toBeInTheDocument()
	})

	it('does not register a contextmenu handler when placement is provided (dropdown mode)', () => {
		const { container } = renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<button type="button">Open</button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const root = bySlot(container, 'menu') as HTMLElement

		expect(root).not.toHaveAttribute('role', 'application')
	})
})

describe('useMenuContext', () => {
	function ContextProbe() {
		const ctx = useMenuContext()

		return <span data-testid="probe">{ctx.open ? 'open' : 'closed'}</span>
	}

	it('returns combined state and actions when called inside a Menu', () => {
		renderUI(
			<Menu defaultOpen>
				<MenuTrigger>Open</MenuTrigger>
				<MenuContent>
					<ContextProbe />
				</MenuContent>
			</Menu>,
		)

		expect(screen.getByTestId('probe')).toHaveTextContent('open')
	})
})
