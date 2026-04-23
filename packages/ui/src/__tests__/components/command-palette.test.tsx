import { describe, expect, it, vi } from 'vitest'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteEmpty,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteShortcut,
} from '../../components/command-palette'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('CommandPalette', () => {
	it('renders input when open', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		const input = bySlot(document.body, 'command-palette-input')

		expect(input).toBeInTheDocument()
	})

	it('renders command list when open', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		const list = bySlot(document.body, 'command-palette-list')

		expect(list).toBeInTheDocument()

		expect(list).toHaveAttribute('role', 'listbox')
	})

	it('renders children', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<div>My items</div>
			</CommandPalette>,
		)

		expect(screen.getByText('My items')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<CommandPalette open={false} onOpenChange={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(bySlot(document.body, 'command-palette-input')).not.toBeInTheDocument()
	})

	it('renders close button', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(screen.getByLabelText('Close')).toBeInTheDocument()
	})

	it('applies placeholder to input', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}} placeholder="Search commands">
				<div>Items</div>
			</CommandPalette>,
		)

		const input = bySlot(document.body, 'command-palette-input')

		expect(input).toHaveAttribute('placeholder', 'Search commands')
	})
})

describe('CommandPaletteGroup', () => {
	it('renders with data-slot="command-palette-group"', () => {
		const { container } = renderUI(
			<CommandPaletteGroup>
				<div>child</div>
			</CommandPaletteGroup>,
		)

		expect(bySlot(container, 'command-palette-group')).toBeInTheDocument()
	})

	it('renders the heading when provided', () => {
		const { container } = renderUI(
			<CommandPaletteGroup heading="Actions">
				<div>child</div>
			</CommandPaletteGroup>,
		)

		const heading = bySlot(container, 'command-palette-heading')

		expect(heading).toHaveTextContent('Actions')
	})

	it('omits the heading slot when no heading is provided', () => {
		const { container } = renderUI(
			<CommandPaletteGroup>
				<div>child</div>
			</CommandPaletteGroup>,
		)

		expect(bySlot(container, 'command-palette-heading')).not.toBeInTheDocument()
	})

	it('applies a custom className to the group', () => {
		const { container } = renderUI(
			<CommandPaletteGroup className="custom">
				<div>child</div>
			</CommandPaletteGroup>,
		)

		expect(bySlot(container, 'command-palette-group')?.className).toContain('custom')
	})
})

describe('CommandPaletteEmpty', () => {
	it('renders children inside an alert', () => {
		const { container } = renderUI(<CommandPaletteEmpty>No results</CommandPaletteEmpty>)

		expect(bySlot(container, 'alert')).toBeInTheDocument()

		expect(screen.getByText('No results')).toBeInTheDocument()
	})
})

describe('CommandPaletteItem', () => {
	it('renders as a button by default', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Item</CommandPaletteItem>
			</CommandPalette>,
		)

		const item = bySlot(document.body, 'command-palette-item')

		expect(item?.tagName).toBe('BUTTON')

		expect(item).toHaveAttribute('role', 'option')
	})

	it('renders as a link when href is provided', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem href="/docs">Docs</CommandPaletteItem>
			</CommandPalette>,
		)

		const item = bySlot(document.body, 'command-palette-item')

		expect(item?.tagName).toBe('A')

		expect(item).toHaveAttribute('href', '/docs')
	})

	it('calls onAction and closes the palette on click', async () => {
		const onOpenChange = vi.fn()

		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<CommandPaletteItem onAction={onAction}>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByText('Run'))

		expect(onAction).toHaveBeenCalled()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('does not close the palette when closeOnAction is false', async () => {
		const onOpenChange = vi.fn()

		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<CommandPaletteItem onAction={onAction} closeOnAction={false}>
					Run
				</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByText('Run'))

		expect(onAction).toHaveBeenCalled()

		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	it('does not invoke onAction when disabled', async () => {
		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem disabled onAction={onAction}>
					Run
				</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByText('Run'))

		expect(onAction).not.toHaveBeenCalled()
	})
})

describe('CommandPaletteLabel and CommandPaletteDescription', () => {
	it('renders the label with data-slot="command-palette-label"', () => {
		const { container } = renderUI(<CommandPaletteLabel>Label</CommandPaletteLabel>)

		expect(bySlot(container, 'command-palette-label')).toHaveTextContent('Label')
	})

	it('renders the description with data-slot="command-palette-description"', () => {
		const { container } = renderUI(<CommandPaletteDescription>About</CommandPaletteDescription>)

		expect(bySlot(container, 'command-palette-description')).toHaveTextContent('About')
	})

	it('renders the shortcut with data-slot="command-palette-shortcut"', () => {
		const { container } = renderUI(<CommandPaletteShortcut>⌘K</CommandPaletteShortcut>)

		expect(bySlot(container, 'command-palette-shortcut')).toBeInTheDocument()
	})
})
