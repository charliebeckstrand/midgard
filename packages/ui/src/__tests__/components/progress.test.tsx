import { describe, expect, it } from 'vitest'
import {
	ProgressBar,
	ProgressBarSkeleton,
	ProgressGauge,
	ProgressGaugeSkeleton,
} from '../../components/progress'
import { bySlot, renderUI, screen } from '../helpers'

describe('ProgressBar', () => {
	it('pairs with an explicit ProgressBarSkeleton in loading trees', () => {
		const { container } = renderUI(<ProgressBarSkeleton />)

		expect(bySlot(container, 'progress-bar')).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('sets progressbar role and aria attributes', () => {
		const { container } = renderUI(<ProgressBar value={50} max={100} aria-label="Progress" />)

		const el = bySlot(container, 'progress-bar')

		expect(el).toHaveAttribute('role', 'progressbar')

		expect(el).toHaveAttribute('aria-valuenow', '50')

		expect(el).toHaveAttribute('aria-valuemin', '0')

		expect(el).toHaveAttribute('aria-valuemax', '100')
	})

	it('treats value={NaN} as indeterminate instead of rendering NaN attributes', () => {
		renderUI(<ProgressBar value={Number.NaN} aria-label="Loading" />)

		const bar = screen.getByRole('progressbar')

		expect(bar).not.toHaveAttribute('aria-valuenow')
	})

	it('renders an indeterminate bar when value is undefined', () => {
		const { container } = renderUI(<ProgressBar aria-label="Progress" />)

		const el = bySlot(container, 'progress-bar')

		expect(el).not.toHaveAttribute('aria-valuenow')
	})

	it('clamps aria-valuenow to max when value exceeds it', () => {
		const { container } = renderUI(<ProgressBar value={150} max={100} aria-label="Progress" />)

		expect(bySlot(container, 'progress-bar')).toHaveAttribute('aria-valuenow', '100')
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
	it('pairs with an explicit ProgressGaugeSkeleton in loading trees', () => {
		const { container } = renderUI(<ProgressGaugeSkeleton />)

		expect(bySlot(container, 'progress-gauge')).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

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

	it('renders a numeric label when label is true', () => {
		renderUI(<ProgressGauge value={42} label aria-label="Progress" />)

		expect(screen.getByText('42')).toBeInTheDocument()
	})

	it('renders a custom label node when provided', () => {
		renderUI(<ProgressGauge value={75} label={<span>3 of 4</span>} aria-label="Progress" />)

		expect(screen.getByText('3 of 4')).toBeInTheDocument()
	})

	it('renders no label slot for label={false}', () => {
		const { container } = renderUI(<ProgressGauge value={40} label={false} aria-label="Used" />)

		// `false` renders no label span over the gauge.
		expect(container.querySelector('[data-slot="progress-gauge"] span')).toBeNull()
	})

	it('omits the label slot when no label is provided', () => {
		const { container } = renderUI(<ProgressGauge value={50} aria-label="Progress" />)

		const el = bySlot(container, 'progress-gauge')

		expect(el?.querySelector('span')).toBeNull()
	})
})
