import { describe, expect, it } from 'vitest'
import {
	StatDelta,
	StatDeltaSkeleton,
	StatDescriptionSkeleton,
	StatLabelSkeleton,
	StatValue,
	StatValueSkeleton,
} from '../../components/stat'
import { Density, useDensityStep } from '../../primitives/density'
import { bySlot, renderUI } from '../helpers'

describe('Stat skeleton variants', () => {
	it.each([
		['label', () => <StatLabelSkeleton />],
		['value', () => <StatValueSkeleton size="sm" />],
		['delta', () => <StatDeltaSkeleton />],
		['description', () => <StatDescriptionSkeleton />],
	])('renders a %s-shaped placeholder', (_shape, ui) => {
		const { container } = renderUI(ui())

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('StatValue size resolution', () => {
	it('writes an explicit size as a density scope', () => {
		const { container } = renderUI(<StatValue size="sm">100</StatValue>)

		expect(bySlot(container, 'stat-value')).toHaveAttribute('data-density', 'sm')
	})

	it('opens the density context of its size for client descendants', () => {
		function Probe() {
			return <span data-slot="probe">{useDensityStep()}</span>
		}

		const { container } = renderUI(
			<Density step="lg">
				<StatValue size="sm">
					<Probe />
				</StatValue>
			</Density>,
		)

		expect(bySlot(container, 'stat-value')).toHaveAttribute('data-density', 'sm')

		expect(bySlot(container, 'probe')).toHaveTextContent('sm')
	})

	it('accepts trend on StatDelta', () => {
		const { container } = renderUI(<StatDelta trend="up">+5%</StatDelta>)

		expect(bySlot(container, 'stat-delta')).toHaveClass('text-green-700')
	})
})
