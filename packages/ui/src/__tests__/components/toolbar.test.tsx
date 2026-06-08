import { describe, expect, it } from 'vitest'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { TOOLBAR_ITEM_SELECTOR } from '../../components/toolbar/toolbar-constants'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Toolbar', () => {
	it('renders children', () => {
		renderUI(
			<Toolbar aria-label="Editor">
				<button type="button">Action</button>
			</Toolbar>,
		)

		expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
	})

	it('has role="toolbar"', () => {
		const { container } = renderUI(<Toolbar aria-label="Editor">content</Toolbar>)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('role', 'toolbar')
	})

	it('defaults to horizontal aria-orientation', () => {
		const { container } = renderUI(<Toolbar aria-label="Editor">content</Toolbar>)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('aria-orientation', 'horizontal')
	})

	it('reflects the orientation prop on aria-orientation', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor" orientation="vertical">
				content
			</Toolbar>,
		)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('passes aria-label through', () => {
		const { container } = renderUI(<Toolbar aria-label="Formatting">content</Toolbar>)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('aria-label', 'Formatting')
	})

	it('moves focus to the next item on ArrowRight', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor">
				<button type="button">A</button>
				<button type="button">B</button>
			</Toolbar>,
		)

		const [first, second] = Array.from(container.querySelectorAll('button'))

		first?.focus()

		expect(document.activeElement).toBe(first)

		fireEvent.keyDown(bySlot(container, 'toolbar') as HTMLElement, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(second)
	})

	it('skips disabled items during keyboard navigation', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor">
				<button type="button">A</button>
				<button type="button" disabled>
					B
				</button>
				<button type="button">C</button>
			</Toolbar>,
		)

		const buttons = Array.from(container.querySelectorAll('button'))

		buttons[0]?.focus()

		fireEvent.keyDown(bySlot(container, 'toolbar') as HTMLElement, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(buttons[2])
	})

	it('is a single Tab stop — only the resting item is tabbable, and the stop follows arrows', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor">
				<button type="button">A</button>
				<button type="button">B</button>
				<button type="button">C</button>
			</Toolbar>,
		)

		const buttons = Array.from(container.querySelectorAll('button'))

		// At rest exactly one control is in the tab order (the first).
		expect(buttons.map((b) => b.tabIndex)).toEqual([0, -1, -1])

		buttons[0]?.focus()

		fireEvent.keyDown(bySlot(container, 'toolbar') as HTMLElement, { key: 'ArrowRight' })

		// The roving stop moves with focus so re-Tabbing returns to the last item.
		expect(buttons.map((b) => b.tabIndex)).toEqual([-1, 0, -1])
	})

	it('keeps a custom [tabindex] item in the roving query after demotion', () => {
		// Regression: roving demotes non-resting items to tabindex="-1". Matching
		// only [tabindex="0"] dropped a demoted custom item from the query,
		// orphaning it and making it unreachable by arrow keys.
		const { container } = renderUI(
			<Toolbar aria-label="Editor">
				<button type="button">A</button>
				{/* biome-ignore lint/a11y/noNoninteractiveTabindex: a bare-tabindex custom focusable is exactly the roving-managed case under test */}
				<div tabIndex={0} data-testid="custom">
					Custom
				</div>
				<button type="button">B</button>
			</Toolbar>,
		)

		const custom = screen.getByTestId('custom')

		// Roving has demoted the non-resting custom item.
		expect(custom).toHaveAttribute('tabindex', '-1')

		// It must still be matched by the toolbar item selector so arrow-key
		// navigation can land on it.
		const matched = Array.from(
			(bySlot(container, 'toolbar') as HTMLElement).querySelectorAll(TOOLBAR_ITEM_SELECTOR),
		)

		expect(matched).toContain(custom)
	})
})

describe('ToolbarGroup', () => {
	it('has role="group"', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor">
				<ToolbarGroup aria-label="Marks">
					<button type="button">A</button>
				</ToolbarGroup>
			</Toolbar>,
		)

		const el = bySlot(container, 'toolbar-group')

		expect(el).toHaveAttribute('role', 'group')

		expect(el).toHaveAttribute('aria-label', 'Marks')
	})

	it('inherits orientation from the surrounding toolbar', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor" orientation="vertical">
				<ToolbarGroup>
					<button type="button">A</button>
				</ToolbarGroup>
			</Toolbar>,
		)

		expect(bySlot(container, 'toolbar-group')).toBeInTheDocument()
	})

	it('honors an explicit orientation prop over the toolbar context', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor" orientation="horizontal">
				<ToolbarGroup orientation="vertical">
					<button type="button">A</button>
				</ToolbarGroup>
			</Toolbar>,
		)

		expect(bySlot(container, 'toolbar-group')).toBeInTheDocument()
	})
})

describe('ToolbarSeparator', () => {
	it('has role="separator" with aria-orientation opposite the toolbar', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor" orientation="horizontal">
				<button type="button">A</button>
				<ToolbarSeparator />
			</Toolbar>,
		)

		const el = bySlot(container, 'toolbar-separator')

		expect(el).toHaveAttribute('role', 'separator')

		expect(el).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('renders a horizontal separator when the toolbar is vertical', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor" orientation="vertical">
				<button type="button">A</button>
				<ToolbarSeparator />
				<button type="button">B</button>
			</Toolbar>,
		)

		const el = bySlot(container, 'toolbar-separator')

		// A horizontal <hr> renders without an explicit aria-orientation.
		expect(el).not.toHaveAttribute('aria-orientation')

		expect(el?.className).toContain('my-1')
	})
})
