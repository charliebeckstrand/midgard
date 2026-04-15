import { describe, expect, it } from 'vitest'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from '../../components/stat'
import { bySlot, renderUI, screen } from '../helpers'

describe('Stat', () => {
	it('renders with data-slot="stat"', () => {
		const { container } = renderUI(<Stat>content</Stat>)

		const el = bySlot(container, 'stat')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Stat className="custom">content</Stat>)

		const el = bySlot(container, 'stat')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Stat id="test">content</Stat>)

		const el = bySlot(container, 'stat')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('StatLabel', () => {
	it('renders with data-slot="stat-label"', () => {
		const { container } = renderUI(<StatLabel>Label</StatLabel>)

		expect(bySlot(container, 'stat-label')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<StatLabel>Revenue</StatLabel>)

		expect(screen.getByText('Revenue')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<StatLabel className="custom">Label</StatLabel>)

		const el = bySlot(container, 'stat-label')

		expect(el?.className).toContain('custom')
	})
})

describe('StatValue', () => {
	it('renders with data-slot="stat-value"', () => {
		const { container } = renderUI(<StatValue>100</StatValue>)

		expect(bySlot(container, 'stat-value')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<StatValue>$1,234</StatValue>)

		expect(screen.getByText('$1,234')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<StatValue className="custom">100</StatValue>)

		const el = bySlot(container, 'stat-value')

		expect(el?.className).toContain('custom')
	})
})

describe('StatDelta', () => {
	it('renders with data-slot="stat-delta"', () => {
		const { container } = renderUI(<StatDelta>+5%</StatDelta>)

		expect(bySlot(container, 'stat-delta')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<StatDelta>+12%</StatDelta>)

		expect(screen.getByText('+12%')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<StatDelta className="custom">+5%</StatDelta>)

		const el = bySlot(container, 'stat-delta')

		expect(el?.className).toContain('custom')
	})
})

describe('StatDescription', () => {
	it('renders with data-slot="stat-description"', () => {
		const { container } = renderUI(<StatDescription>vs last month</StatDescription>)

		expect(bySlot(container, 'stat-description')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<StatDescription>Compared to last month</StatDescription>)

		expect(screen.getByText('Compared to last month')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<StatDescription className="custom">desc</StatDescription>)

		const el = bySlot(container, 'stat-description')

		expect(el?.className).toContain('custom')
	})
})
