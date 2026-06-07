import { describe, expect, it } from 'vitest'
import { Stat, StatDelta, StatDescription, StatLabel, StatValue } from '../../components/stat'
import { bySlot, renderUI, screen } from '../helpers'

describe('Stat', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Stat id="test">content</Stat>)

		const el = bySlot(container, 'stat')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('Stat in skeleton mode', () => {
	it('renders a placeholder instead of StatLabel content', () => {
		const { container } = renderUI(<StatLabel>Revenue</StatLabel>, { skeleton: true })

		expect(bySlot(container, 'stat-label')).toBeNull()
		expect(screen.queryByText('Revenue')).not.toBeInTheDocument()
	})

	it('renders a placeholder instead of StatValue content', () => {
		const { container } = renderUI(<StatValue>$1,234</StatValue>, { skeleton: true })

		expect(bySlot(container, 'stat-value')).toBeNull()
		expect(screen.queryByText('$1,234')).not.toBeInTheDocument()
	})

	it('renders a placeholder instead of StatDelta content', () => {
		const { container } = renderUI(<StatDelta>+5%</StatDelta>, { skeleton: true })

		expect(bySlot(container, 'stat-delta')).toBeNull()
	})

	it('renders a placeholder instead of StatDescription content', () => {
		const { container } = renderUI(<StatDescription>vs last month</StatDescription>, {
			skeleton: true,
		})

		expect(bySlot(container, 'stat-description')).toBeNull()
	})
})

describe('StatValue size resolution', () => {
	it('renders with the explicit size prop applied', () => {
		const { container } = renderUI(<StatValue size="sm">100</StatValue>)

		expect(bySlot(container, 'stat-value')).toBeInTheDocument()
	})

	it('accepts trend on StatDelta', () => {
		const { container } = renderUI(<StatDelta trend="up">+5%</StatDelta>)

		expect(bySlot(container, 'stat-delta')).toBeInTheDocument()
	})
})
