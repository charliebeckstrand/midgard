import { describe, expect, it } from 'vitest'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { bySlot, renderUI, screen } from '../helpers'

describe('ProgressBar', () => {
	it('sets progressbar role and aria attributes', () => {
		const { container } = renderUI(<ProgressBar value={50} max={100} aria-label="Progress" />)

		const el = bySlot(container, 'progress-bar')

		expect(el).toHaveAttribute('role', 'progressbar')

		expect(el).toHaveAttribute('aria-valuenow', '50')

		expect(el).toHaveAttribute('aria-valuemin', '0')

		expect(el).toHaveAttribute('aria-valuemax', '100')
	})

	it('renders an indeterminate bar when value is undefined', () => {
		const { container } = renderUI(<ProgressBar aria-label="Progress" />)

		const el = bySlot(container, 'progress-bar')

		expect(el).not.toHaveAttribute('aria-valuenow')
	})

	it('supports the size and color variants', () => {
		const { container } = renderUI(
			<ProgressBar value={50} size="sm" color="green" aria-label="Progress" />,
		)

		expect(bySlot(container, 'progress-bar')).toBeInTheDocument()
	})

	it('honours aria-labelledby instead of aria-label', () => {
		const { container } = renderUI(
			<>
				<span id="lbl">Progress</span>
				<ProgressBar value={50} aria-labelledby="lbl" />
			</>,
		)

		const el = bySlot(container, 'progress-bar')

		expect(el).toHaveAttribute('aria-labelledby', 'lbl')
	})
})

describe('ProgressGauge', () => {
	it('sets progressbar role and aria attributes', () => {
		const { container } = renderUI(<ProgressGauge value={75} max={100} aria-label="Progress" />)

		const el = bySlot(container, 'progress-gauge')

		expect(el).toHaveAttribute('role', 'progressbar')

		expect(el).toHaveAttribute('aria-valuenow', '75')

		expect(el).toHaveAttribute('aria-valuemax', '100')
	})

	it('renders a numeric label when label is true', () => {
		renderUI(<ProgressGauge value={42} label aria-label="Progress" />)

		expect(screen.getByText('42')).toBeInTheDocument()
	})

	it('renders a custom label node when provided', () => {
		renderUI(<ProgressGauge value={75} label={<span>3 of 4</span>} aria-label="Progress" />)

		expect(screen.getByText('3 of 4')).toBeInTheDocument()
	})

	it('omits the label slot when no label is provided', () => {
		const { container } = renderUI(<ProgressGauge value={50} aria-label="Progress" />)

		const el = bySlot(container, 'progress-gauge')

		expect(el?.querySelector('span')).toBeNull()
	})
})
