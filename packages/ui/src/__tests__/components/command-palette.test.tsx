import { describe, expect, it, vi } from 'vitest'
import {
	CommandPalette,
	CommandPaletteDescription,
	CommandPaletteEmpty,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../components/command-palette'
import { bySlot, fireEvent, renderUI, screen, userEvent, waitFor } from '../helpers'

const FILTER_ITEMS = ['Alpha', 'Beta', 'Gamma']

// Function children that filter against the deferred query, mirroring real usage.
function FilteredPalette() {
	return (
		<CommandPalette open onOpenChange={() => {}}>
			{(_query, deferredQuery) =>
				FILTER_ITEMS.filter((label) =>
					label.toLowerCase().includes(deferredQuery.toLowerCase()),
				).map((label) => <CommandPaletteItem key={label}>{label}</CommandPaletteItem>)
			}
		</CommandPalette>
	)
}

describe('CommandPalette', () => {
	it('renders the input, command list, and close button when open', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(bySlot(document.body, 'command-palette-input')).toBeInTheDocument()

		const list = bySlot(document.body, 'command-palette-list')

		expect(list).toBeInTheDocument()

		expect(list).toHaveAttribute('role', 'listbox')

		expect(screen.getByLabelText('Close')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<CommandPalette open={false} onOpenChange={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(bySlot(document.body, 'command-palette-input')).not.toBeInTheDocument()
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

describe('CommandPalette active descendant', () => {
	it('points the input at the active item and marks it aria-selected on arrow', async () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
				<CommandPaletteItem>Beta</CommandPaletteItem>
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox') as HTMLInputElement

		const user = userEvent.setup()

		await user.keyboard('{ArrowDown}')

		const options = screen.getAllByRole('option')

		expect(options[0]).toHaveAttribute('aria-selected', 'true')

		expect(options[0]?.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id)
	})

	it('moves the active item to the top result when the filter changes', async () => {
		renderUI(<FilteredPalette />)

		const user = userEvent.setup()

		// Activate the first option (Alpha), then filter it out.
		await user.keyboard('{ArrowDown}')

		await user.type(screen.getByRole('combobox'), 'gam')

		await waitFor(() => {
			const options = screen.getAllByRole('option')

			expect(options).toHaveLength(1)

			expect(options[0]).toHaveTextContent('Gamma')

			expect(options[0]).toHaveAttribute('aria-selected', 'true')

			expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant', options[0]?.id)
		})
	})

	it('clears the active item when the filter matches nothing', async () => {
		renderUI(<FilteredPalette />)

		const user = userEvent.setup()

		await user.keyboard('{ArrowDown}')

		expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant')

		await user.type(screen.getByRole('combobox'), 'zzz')

		await waitFor(() => {
			expect(screen.queryAllByRole('option')).toHaveLength(0)

			expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant')
		})
	})

	it('exposes a persistent no-results status region as a listbox sibling', () => {
		renderUI(<FilteredPalette />)

		const status = bySlot(document.body, 'command-palette-no-results')

		// `<output>` is implicitly role="status" (a polite live region); stays
		// mounted regardless of results, and a CSS peer-empty toggle reveals it
		// when the listbox filters to empty. Sits outside the listbox
		// (aria-required-children owns only options).
		expect(status?.tagName).toBe('OUTPUT')

		expect(status).toHaveTextContent('No results')

		expect(bySlot(document.body, 'command-palette-list')).not.toContainElement(
			status as HTMLElement,
		)
	})
})

describe('CommandPaletteGroup', () => {
	it('renders the title when provided and labels the group with it', () => {
		const { container } = renderUI(
			<CommandPaletteGroup title="Actions">
				<div>child</div>
			</CommandPaletteGroup>,
		)

		const title = bySlot(container, 'command-palette-title')

		expect(title).toHaveTextContent('Actions')

		const group = bySlot(container, 'command-palette-group')

		expect(group).toHaveAttribute('role', 'group')

		expect(group).toHaveAttribute('aria-labelledby', title?.id)
	})

	it('omits the title slot when no title is provided', () => {
		const { container } = renderUI(
			<CommandPaletteGroup>
				<div>child</div>
			</CommandPaletteGroup>,
		)

		expect(bySlot(container, 'command-palette-title')).not.toBeInTheDocument()
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

		expect(bySlot(container, 'command-palette-empty')).toBeInTheDocument()

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

	it('composes a consumer onClick with the selection handler', async () => {
		const onClick = vi.fn()

		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem onAction={onAction} onClick={onClick}>
					Run
				</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByText('Run'))

		// A consumer handler must not clobber selection/close; both fire.
		expect(onClick).toHaveBeenCalled()

		expect(onAction).toHaveBeenCalled()
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

	it('does not invoke a consumer onClick when disabled', async () => {
		const onClick = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem disabled onClick={onClick}>
					Run
				</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByText('Run'))

		expect(onClick).not.toHaveBeenCalled()
	})

	it('prevents navigation when a disabled link item is clicked', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem disabled href="/somewhere">
					Go
				</CommandPaletteItem>
			</CommandPalette>,
		)

		// fireEvent returns false when the event's default was prevented.
		expect(fireEvent.click(screen.getByText('Go'))).toBe(false)
	})

	it('exposes aria-disabled on a disabled item', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem disabled onAction={() => {}}>
					Run
				</CommandPaletteItem>
			</CommandPalette>,
		)

		expect(screen.getByRole('option')).toHaveAttribute('aria-disabled', 'true')
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
})

describe('CommandPalette triggerShortcut', () => {
	// tinykeys resolves `$mod` to ctrlKey on non-Mac platforms; jsdom is non-Mac.
	function pressModK() {
		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true }),
		)
	}

	it('opens the palette when the default $mod+KeyK fires while closed', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={false} onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK()

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it('closes the palette when the shortcut fires while open', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('does not bind a shortcut when triggerShortcut is false', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={false} onOpenChange={onOpenChange} triggerShortcut={false}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK()

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('accepts a custom shortcut string', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={false} onOpenChange={onOpenChange} triggerShortcut="Shift+KeyP">
				<div>Items</div>
			</CommandPalette>,
		)

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'P', code: 'KeyP', shiftKey: true, bubbles: true }),
		)

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it('accepts an array of shortcuts', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette
				open={false}
				onOpenChange={onOpenChange}
				triggerShortcut={['Shift+KeyP', 'Shift+KeyQ']}
			>
				<div>Items</div>
			</CommandPalette>,
		)

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Q', code: 'KeyQ', shiftKey: true, bubbles: true }),
		)

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})
})

describe('CommandPalette open/close transitions', () => {
	it('clears the query when the palette transitions from open to closed', async () => {
		const { rerender } = renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'p')

		expect(input.value.length).toBeGreaterThan(0)

		rerender(
			<CommandPalette open={false} onOpenChange={() => {}}>
				<CommandPaletteItem>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		rerender(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		const reopenedInput = screen.getByRole('combobox') as HTMLInputElement

		expect(reopenedInput.value).toBe('')
	})

	it('focuses the input on open', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		expect(document.activeElement).toBe(screen.getByRole('combobox'))
	})
})
