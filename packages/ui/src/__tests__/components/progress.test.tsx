import { describe, expect, it } from 'vitest'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { LocaleProvider } from '../../providers/locale'
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

describe('ProgressBar segments and marks', () => {
	const seats = [
		{ value: 252, color: 'blue', label: 'Democrats' },
		{ value: 161, color: 'red', label: 'Republicans', from: 'end' },
	] as const

	it('is an image with a description of each segment and the marks', () => {
		renderUI(
			<ProgressBar
				max={435}
				segments={[...seats]}
				marks={[{ value: 218, label: '218 for a majority.' }]}
				aria-label="House seats"
			/>,
		)

		const bar = screen.getByRole('img', { name: 'House seats' })

		expect(bar).not.toHaveAttribute('aria-valuenow')

		expect(bar).toHaveAccessibleDescription(
			'Democrats 252, Republicans 161, of 435. 218 for a majority.',
		)
	})

	it('stays a progressbar at the value of one segment', () => {
		renderUI(
			<ProgressBar
				max={10}
				segments={[{ value: 4, color: 'green', label: 'Done' }]}
				aria-label="Tasks"
			/>,
		)

		expect(screen.getByRole('progressbar', { name: 'Tasks' })).toHaveAttribute('aria-valuenow', '4')
	})

	it('draws the segments from the end in reverse order after a spacer', () => {
		const { container } = renderUI(
			<ProgressBar
				max={100}
				segments={[
					{ value: 30, color: 'blue', label: 'A' },
					{ value: 20, color: 'red', label: 'B', from: 'end' },
					{ value: 10, color: 'amber', label: 'C', from: 'end' },
				]}
				aria-label="Split"
			/>,
		)

		const row = bySlot(container, 'progress-bar')?.firstElementChild

		const from = [...(row?.children ?? [])].map((el) => el.getAttribute('data-from') ?? 'spacer')

		expect(from).toEqual(['start', 'spacer', 'end', 'end'])
	})

	it('leaves out the spacer when the segments fill the bar', () => {
		const { container } = renderUI(
			<ProgressBar max={413} segments={[...seats]} aria-label="House seats" />,
		)

		expect(bySlot(container, 'progress-bar')?.firstElementChild?.children).toHaveLength(2)
	})

	it('keeps a plain value as a progressbar under marks, with the mark label as its description', () => {
		const { container } = renderUI(
			<ProgressBar value={60} marks={[{ value: 50, label: 'Half' }]} aria-label="Lead" />,
		)

		const bar = screen.getByRole('progressbar', { name: 'Lead' })

		expect(bar).toHaveAttribute('aria-valuenow', '60')

		expect(bar).toHaveAccessibleDescription('Half')

		expect(container.querySelectorAll('[data-slot=progress-mark]')).toHaveLength(1)
	})

	it('keeps the description of the consumer', () => {
		renderUI(
			<>
				<span id="note">Unofficial.</span>
				<ProgressBar
					max={435}
					segments={[...seats]}
					aria-label="House seats"
					aria-describedby="note"
				/>
			</>,
		)

		expect(screen.getByRole('img')).toHaveAccessibleDescription(
			'Unofficial. Democrats 252, Republicans 161, of 435.',
		)
	})

	it('writes the description in the digits of the locale', () => {
		renderUI(
			<LocaleProvider locale="ar-EG">
				<ProgressBar max={435} segments={[...seats]} aria-label="House seats" />
			</LocaleProvider>,
		)

		expect(screen.getByRole('img').getAttribute('aria-describedby')).toBeTruthy()

		expect(screen.getByText(/٢٥٢/)).toBeInTheDocument()
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

	it('writes the numeric readout in the digits of the locale', () => {
		renderUI(
			<LocaleProvider locale="ar-EG">
				<ProgressGauge value={42} centerLabel aria-label="Progress" />
			</LocaleProvider>,
		)

		expect(screen.getByText('٤٢')).toBeInTheDocument()
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

	it.each([
		[0, '1'],
		[5, '5'],
		[18, '6'],
	])('holds strokeWidth=%s between 1 and 6', (strokeWidth, drawn) => {
		const { container } = renderUI(
			<ProgressGauge value={40} strokeWidth={strokeWidth} aria-label="Progress" />,
		)

		for (const circle of bySlot(container, 'progress-gauge')?.querySelectorAll('circle') ?? []) {
			expect(circle).toHaveAttribute('stroke-width', drawn)
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
