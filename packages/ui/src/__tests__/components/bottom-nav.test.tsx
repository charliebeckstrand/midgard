import { describe, expect, it, vi } from 'vitest'
import { BottomNav, BottomNavItem } from '../../components/bottom-nav'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

// Minimal icon element for tests
const TestIcon = <svg data-testid="icon" />

describe('BottomNav', () => {
	it('renders a nav element with data-slot="nav"', () => {
		const { container } = renderUI(
			<BottomNav>
				<BottomNavItem icon={TestIcon}>Home</BottomNavItem>
			</BottomNav>,
		)

		expect(bySlot(container, 'nav')).toBeInTheDocument()
	})

	it('renders its children', () => {
		renderUI(
			<BottomNav>
				<BottomNavItem icon={TestIcon}>Home</BottomNavItem>
				<BottomNavItem icon={TestIcon}>Search</BottomNavItem>
			</BottomNav>,
		)

		expect(screen.getByText('Home')).toBeInTheDocument()
		expect(screen.getByText('Search')).toBeInTheDocument()
	})
})

describe('BottomNavItem', () => {
	it('renders with data-slot="bottom-nav-item"', () => {
		const { container } = renderUI(
			<BottomNav>
				<BottomNavItem icon={TestIcon}>Tab</BottomNavItem>
			</BottomNav>,
		)

		expect(bySlot(container, 'bottom-nav-item')).toBeInTheDocument()
	})

	it('renders as a button by default', () => {
		const { container } = renderUI(
			<BottomNav>
				<BottomNavItem icon={TestIcon}>Tab</BottomNavItem>
			</BottomNav>,
		)
		const item = bySlot(container, 'bottom-nav-item')

		expect(item?.tagName).toBe('BUTTON')
		expect(item).toHaveAttribute('type', 'button')
	})

	it('renders as a link when href is provided', () => {
		const { container } = renderUI(
			<BottomNav>
				<BottomNavItem icon={TestIcon} href="/home">
					Home
				</BottomNavItem>
			</BottomNav>,
		)
		const item = bySlot(container, 'bottom-nav-item')

		expect(item?.tagName).toBe('A')
		expect(item).toHaveAttribute('href', '/home')
	})

	it('marks item as current when current prop is true', () => {
		const { container } = renderUI(
			<BottomNav>
				<BottomNavItem icon={TestIcon} current>
					Active
				</BottomNavItem>
			</BottomNav>,
		)
		const item = bySlot(container, 'bottom-nav-item')

		expect(item).toHaveAttribute('data-current', '')
	})

	it('marks item as current via Nav value context', () => {
		const { container } = renderUI(
			<BottomNav value="home">
				<BottomNavItem icon={TestIcon} value="home">
					Home
				</BottomNavItem>
				<BottomNavItem icon={TestIcon} value="search">
					Search
				</BottomNavItem>
			</BottomNav>,
		)
		const items = allBySlot(container, 'bottom-nav-item')

		expect(items[0]).toHaveAttribute('data-current', '')
		expect(items[1]).not.toHaveAttribute('data-current')
	})

	it('calls onChange with value on click', () => {
		const onChange = vi.fn()
		const { container } = renderUI(
			<BottomNav onChange={onChange}>
				<BottomNavItem icon={TestIcon} value="search">
					Search
				</BottomNavItem>
			</BottomNav>,
		)
		const item = bySlot(container, 'bottom-nav-item')

		item?.click()

		expect(onChange).toHaveBeenCalledWith('search')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<BottomNav>
				<BottomNavItem icon={TestIcon} className="custom">
					Tab
				</BottomNavItem>
			</BottomNav>,
		)
		const item = bySlot(container, 'bottom-nav-item')

		expect(item?.className).toContain('custom')
	})
})
