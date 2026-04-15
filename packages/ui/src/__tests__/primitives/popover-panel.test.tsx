import { describe, expect, it } from 'vitest'
import { PopoverPanel } from '../../primitives/popover-panel'
import { renderUI, screen } from '../helpers'

describe('PopoverPanel', () => {
	it('renders with listbox role by default', () => {
		renderUI(<PopoverPanel>options</PopoverPanel>)

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<PopoverPanel>menu items</PopoverPanel>)

		expect(screen.getByText('menu items')).toBeInTheDocument()
	})

	it('applies custom role', () => {
		renderUI(<PopoverPanel role="menu">items</PopoverPanel>)

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		renderUI(<PopoverPanel className="custom">items</PopoverPanel>)

		const el = screen.getByRole('listbox')

		expect(el.className).toContain('custom')
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
})
