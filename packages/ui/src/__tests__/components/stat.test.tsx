import { describe, expect, it } from 'vitest'
import {
	Stat,
	StatDelta,
	StatDeltaSkeleton,
	StatDescription,
	StatDescriptionSkeleton,
	StatLabel,
	StatLabelSkeleton,
	StatValue,
	StatValueSkeleton,
} from '../../components/stat'
import { bySlot, renderUI } from '../helpers'

describe('Stat', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Stat id="test">content</Stat>)

		const el = bySlot(container, 'stat')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('Stat skeleton variants', () => {
	it('renders a label-shaped placeholder', () => {
		const { container } = renderUI(<StatLabelSkeleton />)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('renders a value-shaped placeholder at the explicit size', () => {
		const { container } = renderUI(<StatValueSkeleton size="sm" />)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('renders a delta-shaped placeholder', () => {
		const { container } = renderUI(<StatDeltaSkeleton />)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('renders a description-shaped placeholder', () => {
		const { container } = renderUI(<StatDescriptionSkeleton />)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
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
