import { describe, expect, it } from 'vitest'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { bySlot, renderUI } from '../helpers'

describe('ProgressBar', () => {
	it('renders with data-slot="progress-bar"', () => {
		const { container } = renderUI(<ProgressBar value={50} />)

		const el = bySlot(container, 'progress-bar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('sets progressbar role and aria attributes', () => {
		const { container } = renderUI(<ProgressBar value={50} max={100} />)

		const el = bySlot(container, 'progress-bar')

		expect(el).toHaveAttribute('role', 'progressbar')

		expect(el).toHaveAttribute('aria-valuenow', '50')

		expect(el).toHaveAttribute('aria-valuemin', '0')

		expect(el).toHaveAttribute('aria-valuemax', '100')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ProgressBar value={50} className="custom" />)

		const el = bySlot(container, 'progress-bar')

		expect(el?.className).toContain('custom')
	})
})

describe('ProgressGauge', () => {
	it('renders with data-slot="progress-gauge"', () => {
		const { container } = renderUI(<ProgressGauge value={75} />)

		const el = bySlot(container, 'progress-gauge')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('sets progressbar role and aria attributes', () => {
		const { container } = renderUI(<ProgressGauge value={75} max={100} />)

		const el = bySlot(container, 'progress-gauge')

		expect(el).toHaveAttribute('role', 'progressbar')

		expect(el).toHaveAttribute('aria-valuenow', '75')

		expect(el).toHaveAttribute('aria-valuemax', '100')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ProgressGauge value={75} className="custom" />)

		const el = bySlot(container, 'progress-gauge')

		expect(el?.className).toContain('custom')
	})
})
