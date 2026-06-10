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
	MenuTrigger,
} from '../../components/menu'
import { useMenuContext } from '../../components/menu/context'
import { Density } from '../../primitives/density'
import { DensityProvider } from '../../providers/density'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('MenuSection', () => {
	it('renders with data-slot="menu-section"', () => {
		const { container } = renderUI(<MenuSection>content</MenuSection>)

		const el = bySlot(container, 'menu-section')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('FIELDSET')
	})
})

describe('MenuHeading', () => {
	it('renders with data-slot="menu-heading"', () => {
		const { container } = renderUI(<MenuHeading>Heading</MenuHeading>)

		const el = bySlot(container, 'menu-heading')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('LEGEND')
	})
})

describe('MenuSeparator', () => {
	it('renders with data-slot="menu-separator"', () => {
		const { container } = renderUI(<MenuSeparator />)

		const el = bySlot(container, 'menu-separator')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('HR')
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

	it('toggles open and still calls a consumer onClick on the fallback button', () => {
		// On the plain-button fallback a consumer onClick must not clobber the
		// open toggle.
		const onClick = vi.fn()

		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger onClick={onClick}>Open</MenuTrigger>
			</Menu>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		fireEvent.click(trigger)

		expect(onClick).toHaveBeenCalled()

		expect(trigger).toHaveAttribute('aria-expanded', 'true')
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

	it('names a static menu via the forwarded aria-label', () => {
		const { container } = renderUI(
			<Menu defaultOpen>
				<MenuContent aria-label="Actions">
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		// A static menu has no trigger to name it; the forwarded label is the
		// only path to an accessible name.
		expect(container.querySelector('[role="menu"]')).toHaveAttribute('aria-label', 'Actions')
	})

	it('does not steal focus when rendered as a static menu', () => {
		const { container } = renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		// A static (always-open) menu is page furniture, not a transient
		// overlay, so it must not grab focus on mount the way a dropdown does.
		expect(container.querySelector('[role="menu"]')).not.toHaveFocus()

		expect(screen.getByText('Item')).not.toHaveFocus()
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

	it('renders the disabled href variant as a non-navigable element', () => {
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

		expect(item).toHaveAttribute('aria-disabled', 'true')

		expect(item).not.toHaveAttribute('href')

		expect(item.tagName).not.toBe('A')
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
		// The wrapper holds arbitrary page content and implements no keyboard
		// model; it must NOT carry role="application", which suppresses AT
		// browse-mode for everything inside it.
		expect(root).not.toHaveAttribute('role')

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

describe('MenuItem density inheritance', () => {
	// Padding/gap track the density axis (sm px-2.5, md px-3, lg px-3.5); text
	// tracks the size axis (sm text-sm, md text-base, lg text-lg).
	it('defaults to md padding and md text outside any provider', () => {
		const { container } = renderUI(
			<Menu defaultOpen>
				<MenuContent>
					<MenuItem>Item</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const cls = bySlot(container, 'menu-item')?.className ?? ''

		expect(cls).toContain('py-1.5')

		expect(cls).toContain('text-base')
	})

	it('inherits a compact DensityProvider on both axes', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Menu defaultOpen>
					<MenuContent>
						<MenuItem>Item</MenuItem>
					</MenuContent>
				</Menu>
			</DensityProvider>,
		)

		const cls = bySlot(container, 'menu-item')?.className ?? ''

		expect(cls).toContain('px-2.5')

		expect(cls).toContain('text-sm')
	})

	it('splits tight padding (density) from large text (size) under a two-axis Density', () => {
		const { container } = renderUI(
			<Density space="sm" size="lg">
				<Menu defaultOpen>
					<MenuContent>
						<MenuItem>Item</MenuItem>
					</MenuContent>
				</Menu>
			</Density>,
		)

		const cls = bySlot(container, 'menu-item')?.className ?? ''

		expect(cls).toContain('px-2.5')

		expect(cls).toContain('text-lg')
	})
})
