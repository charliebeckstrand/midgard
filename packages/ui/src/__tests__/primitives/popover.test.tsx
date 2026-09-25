import { describe, expect, it } from 'vitest'
import { PopoverPanel } from '../../primitives/popover'
import { fireEvent, renderUI, screen } from '../helpers'

describe('PopoverPanel', () => {
	it('renders with listbox role by default', () => {
		renderUI(<PopoverPanel>options</PopoverPanel>)

		expect(screen.getByRole('listbox')).toBeInTheDocument()
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

	it('applies custom role', () => {
		renderUI(<PopoverPanel role="menu">items</PopoverPanel>)

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	it('sets tabIndex to -1', () => {
		renderUI(<PopoverPanel>items</PopoverPanel>)

		const el = screen.getByRole('listbox')

		expect(el).toHaveAttribute('tabindex', '-1')
	})

	it('applies custom id', () => {
		renderUI(<PopoverPanel id="my-panel">items</PopoverPanel>)

		const el = screen.getByRole('listbox')

		expect(el).toHaveAttribute('id', 'my-panel')
	})

	it('marks the glass panel as the group the item wash keys on', () => {
		renderUI(<PopoverPanel glass>items</PopoverPanel>)

		const el = screen.getByRole('listbox')

		expect(el.className).toContain('group/glass')

		expect(el).toHaveAttribute('data-glass', '')
	})

	it('leaves the group marker off the default surface', () => {
		renderUI(<PopoverPanel>items</PopoverPanel>)

		const el = screen.getByRole('listbox')

		expect(el.className).not.toContain('group/glass')

		expect(el).not.toHaveAttribute('data-glass')
	})
})
