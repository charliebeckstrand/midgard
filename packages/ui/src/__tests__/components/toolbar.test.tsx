import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { TOOLBAR_ITEM_SELECTOR } from '../../components/toolbar/toolbar-constants'
import { bySlot, fireEvent, renderUI, screen, userEvent, waitFor } from '../helpers'

describe('Toolbar', () => {
	it('renders children with role="toolbar"', () => {
		const { container } = renderUI(
			<Toolbar aria-label="Editor">
				<button type="button">Action</button>
			</Toolbar>,
		)

		expect(bySlot(container, 'toolbar')).toHaveAttribute('role', 'toolbar')

		expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
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

	it('is a single Tab stop: only the resting item is tabbable, and the stop follows arrows', () => {
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

	it('keeps the resting Tab stop on the focused control when a disabled sibling re-enables', async () => {
		// A control that becomes enabled arrives at the native `tabIndex=0`,
		// indistinguishable by count from the deliberate stop. With focus on
		// another control, the resting stop holds on the focused one rather
		// than jumping to the new arrival.
		function Harness() {
			const [enabled, setEnabled] = useState(false)

			return (
				<Toolbar aria-label="Editor">
					<button type="button" disabled={!enabled}>
						A
					</button>
					<button type="button" onClick={() => setEnabled(true)}>
						B
					</button>
					<button type="button">C</button>
				</Toolbar>
			)
		}

		renderUI(<Harness />)

		const b = screen.getByRole('button', { name: 'B' })

		// Activate B (focus stays on it); its handler re-enables A.
		await userEvent.click(b)

		const a = screen.getByRole('button', { name: 'A' })

		const c = screen.getByRole('button', { name: 'C' })

		// The freshly-enabled A stays demoted; the resting stop holds on focused B.
		await waitFor(() => expect(b.tabIndex).toBe(0))

		expect(a.tabIndex).toBe(-1)

		expect(c.tabIndex).toBe(-1)
	})

	it('keeps a custom [tabindex] item in the roving query after demotion', () => {
		// Roving demotes non-resting items to tabindex="-1". The item selector
		// still matches a demoted custom item, keeping it reachable by arrow keys.
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

	it('gives the vertical rule a stretchable height so it is visible in a horizontal toolbar', () => {
		// Preflight pins `hr { height: 0 }`, which defeats `self-stretch` unless
		// height is reset to auto; without it the rule collapses to nothing.
		const { container } = renderUI(
			<Toolbar aria-label="Editor" orientation="horizontal">
				<button type="button">A</button>
				<ToolbarSeparator />
				<button type="button">B</button>
			</Toolbar>,
		)

		const el = bySlot(container, 'toolbar-separator')

		expect(el?.className).toContain('h-auto')

		expect(el?.className).toContain('self-stretch')
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
