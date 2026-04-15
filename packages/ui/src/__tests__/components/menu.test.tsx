import { describe, expect, it } from 'vitest'
import { Menu, MenuTrigger } from '../../components/menu'
import { bySlot, renderUI, screen } from '../helpers'

describe('Menu', () => {
	it('renders with data-slot="menu"', () => {
		const { container } = renderUI(
			<Menu>
				<MenuTrigger>
					<button type="button">Open</button>
				</MenuTrigger>
			</Menu>,
		)

		const el = bySlot(container, 'menu')

		expect(el).toBeInTheDocument()
	})

	it('renders trigger content', () => {
		renderUI(
			<Menu>
				<MenuTrigger>
					<button type="button">Open Menu</button>
				</MenuTrigger>
			</Menu>,
		)

		expect(screen.getByText('Open Menu')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Menu className="custom">
				<MenuTrigger>
					<button type="button">Open</button>
				</MenuTrigger>
			</Menu>,
		)

		const el = bySlot(container, 'menu')

		expect(el?.className).toContain('custom')
	})
})
