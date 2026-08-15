import { describe, expect, it } from 'vitest'
import { PopoverPanel } from '../../primitives/popover'
import { renderUI, screen } from '../helpers'

describe('PopoverPanel', () => {
	it('renders with listbox role by default', () => {
		renderUI(<PopoverPanel>options</PopoverPanel>)

		expect(screen.getByRole('listbox')).toBeInTheDocument()
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
