import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { PopoverPanel } from '../../primitives/popover'
import { fireEvent, renderUI, screen } from '../helpers'

describe('PopoverPanel', () => {
	it('passes native attributes and a ref to the panel, and keeps its anchor', () => {
		const ref = createRef<HTMLDivElement>()

		renderUI(
			<PopoverPanel ref={ref} data-testid="panel" data-slot="custom" title="Options">
				options
			</PopoverPanel>,
		)

		const panel = screen.getByRole('listbox')

		expect(ref.current).toBe(panel)

		expect(panel).toHaveAttribute('data-testid', 'panel')

		expect(panel).toHaveAttribute('title', 'Options')

		// `ListboxPanel` finds the panel by its anchor, so a consumer prop does not rename it.
		expect(panel).toHaveAttribute('data-slot', 'popover-panel')
	})

	// Roving is a keyboard model no consumer switches off, so a consumer
	// `preventDefault()` does not cancel it (CONVENTIONS.md §3.9).
	it('runs a consumer onKeyDown before roving, which still moves focus when it prevents the default', () => {
		const seen: boolean[] = []

		renderUI(
			<PopoverPanel
				onKeyDown={(event) => {
					seen.push(event.defaultPrevented)

					event.preventDefault()
				}}
			>
				<div role="option" tabIndex={-1} aria-selected={false}>
					One
				</div>
				<div role="option" tabIndex={-1} aria-selected={false}>
					Two
				</div>
			</PopoverPanel>,
		)

		const [first, second] = screen.getAllByRole('option')

		first?.focus()

		fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })

		expect(seen).toEqual([false])

		expect(second).toHaveFocus()
	})

	// A selector list takes the `[data-selected]` filter on each of its
	// selectors, so autofocus lands on the selected row.
	it('focuses the selected item when itemSelector is a selector list', () => {
		renderUI(
			<PopoverPanel itemSelector="a, button">
				<a href="#other">Other</a>
				<button type="button" data-selected="">
					Selected
				</button>
			</PopoverPanel>,
		)

		expect(screen.getByRole('button', { name: 'Selected' })).toHaveFocus()
	})

	it('applies custom role', () => {
		renderUI(<PopoverPanel role="menu">items</PopoverPanel>)

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	it('renders no role attribute for role="none"', () => {
		const { container } = renderUI(<PopoverPanel role="none">items</PopoverPanel>)

		// The panel is focusable, and a browser ignores `role="none"` on a focusable element.
		expect(container.querySelector('[data-slot="popover-panel"]')).not.toHaveAttribute('role')
	})

	it('sets tabIndex to -1', () => {
		renderUI(<PopoverPanel>items</PopoverPanel>)

		const panel = screen.getByRole('listbox')

		expect(panel).toHaveAttribute('tabindex', '-1')
	})

	it('marks the glass panel as the group the item wash keys on', () => {
		renderUI(<PopoverPanel glass>items</PopoverPanel>)

		const panel = screen.getByRole('listbox')

		expect(panel.className).toContain('group/glass')

		expect(panel).toHaveAttribute('data-glass', '')
	})

	it('leaves the group marker off the default surface', () => {
		renderUI(<PopoverPanel>items</PopoverPanel>)

		const panel = screen.getByRole('listbox')

		expect(panel.className).not.toContain('group/glass')

		expect(panel).not.toHaveAttribute('data-glass')
	})
})
