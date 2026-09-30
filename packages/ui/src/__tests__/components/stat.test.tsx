import { describe, expect, it } from 'vitest'
import {
	StatDelta,
	StatDeltaSkeleton,
	StatDescriptionSkeleton,
	StatLabelSkeleton,
	StatValue,
	StatValueSkeleton,
} from '../../components/stat'
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
	it('renders with the explicit size prop applied', () => {
		const { container } = renderUI(<StatValue size="sm">100</StatValue>)

		expect(bySlot(container, 'stat-value')).toHaveClass('text-2xl')
	})

	it('accepts trend on StatDelta', () => {
		const { container } = renderUI(<StatDelta trend="up">+5%</StatDelta>)

		expect(bySlot(container, 'stat-delta')).toHaveClass('text-green-700')
	})
})
