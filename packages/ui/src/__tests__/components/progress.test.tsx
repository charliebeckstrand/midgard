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

	it.each([
		['NaN', Number.NaN],
		['undefined', undefined],
	])('renders an indeterminate bar, with no aria-valuenow, for value=%s', (_name, value) => {
		renderUI(<ProgressBar value={value} aria-label="Loading" />)

		expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
	})

	it('clamps aria-valuenow to max when value exceeds it', () => {
		const { container } = renderUI(<ProgressBar value={150} max={100} aria-label="Progress" />)

		expect(bySlot(container, 'progress-bar')).toHaveAttribute('aria-valuenow', '100')
	})

	it('keeps the progressbar role when a consumer passes another role', () => {
		// The props type has no `role`, so a cast reaches the spread.
		const stray = { role: 'status' } as Record<string, string>

		renderUI(<ProgressBar value={50} aria-label="Progress" {...stray} />)

		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
	})

	it('honors aria-labelledby instead of aria-label', () => {
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

	it('clamps aria-valuenow to max when value exceeds it', () => {
		const { container } = renderUI(<ProgressGauge value={150} max={100} aria-label="Progress" />)

		expect(bySlot(container, 'progress-gauge')).toHaveAttribute('aria-valuenow', '100')
	})

	it('renders a numeric readout when centerLabel is true', () => {
		renderUI(<ProgressGauge value={42} centerLabel aria-label="Progress" />)

		expect(screen.getByText('42')).toBeInTheDocument()
	})

	it('renders a custom label node when provided', () => {
		renderUI(<ProgressGauge value={75} centerLabel={<span>3 of 4</span>} aria-label="Progress" />)

		expect(screen.getByText('3 of 4')).toBeInTheDocument()
	})

	it.each([
		['centerLabel={false}', false],
		['no centerLabel', undefined],
	])('renders no readout slot for %s', (_name, centerLabel) => {
		const { container } = renderUI(
			<ProgressGauge value={40} centerLabel={centerLabel} aria-label="Used" />,
		)

		expect(bySlot(container, 'progress-gauge')?.querySelector('span')).toBeNull()
	})

	it('reads a NaN value as zero', () => {
		const { container } = renderUI(
			<ProgressGauge value={Number.NaN} centerLabel aria-label="Progress" />,
		)

		const el = bySlot(container, 'progress-gauge')

		expect(el).toHaveAttribute('aria-valuenow', '0')

		expect(screen.getByText('0')).toBeInTheDocument()

		for (const circle of el?.querySelectorAll('circle') ?? []) {
			expect(circle.getAttribute('stroke-dasharray')).not.toBe('NaN')
		}
	})

	it.each([36, 50])('keeps a positive ring radius for strokeWidth=%i', (strokeWidth) => {
		const { container } = renderUI(
			<ProgressGauge value={40} strokeWidth={strokeWidth} aria-label="Progress" />,
		)

		for (const circle of bySlot(container, 'progress-gauge')?.querySelectorAll('circle') ?? []) {
			expect(Number(circle.getAttribute('r'))).toBeGreaterThan(0)
		}
	})
})
