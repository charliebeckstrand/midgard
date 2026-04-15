import { describe, expect, it } from 'vitest'
import { CommandPalette } from '../../components/command-palette'
import { renderUI, screen } from '../helpers'

describe('CommandPalette', () => {
	it('renders input when open', () => {
		renderUI(
			<CommandPalette open onClose={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		const input = document.querySelector('[data-slot="command-palette-input"]')

		expect(input).toBeInTheDocument()
	})

	it('renders command list when open', () => {
		renderUI(
			<CommandPalette open onClose={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		const list = document.querySelector('[data-slot="command-palette-list"]')

		expect(list).toBeInTheDocument()

		expect(list).toHaveAttribute('role', 'listbox')
	})

	it('renders children', () => {
		renderUI(
			<CommandPalette open onClose={() => {}}>
				<div>My items</div>
			</CommandPalette>,
		)

		expect(screen.getByText('My items')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<CommandPalette open={false} onClose={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(document.querySelector('[data-slot="command-palette-input"]')).not.toBeInTheDocument()
	})

	it('renders close button', () => {
		renderUI(
			<CommandPalette open onClose={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(screen.getByLabelText('Close')).toBeInTheDocument()
	})

	it('applies placeholder to input', () => {
		renderUI(
			<CommandPalette open onClose={() => {}} placeholder="Search commands">
				<div>Items</div>
			</CommandPalette>,
		)

		const input = document.querySelector('[data-slot="command-palette-input"]')

		expect(input).toHaveAttribute('placeholder', 'Search commands')
	})
})
