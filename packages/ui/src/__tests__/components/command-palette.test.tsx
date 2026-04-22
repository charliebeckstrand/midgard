import { describe, expect, it } from 'vitest'
import { CommandPalette } from '../../components/command-palette'
import { bySlot, renderUI, screen } from '../helpers'

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
