import { describe, expect, it } from 'vitest'
import {
	Timeline,
	TimelineDescription,
	TimelineHeading,
	TimelineItem,
	TimelineMarker,
	TimelineTimestamp,
} from '../../components/timeline'
import { bySlot, renderUI, screen } from '../helpers'

describe('Timeline', () => {
	it('renders with data-slot="timeline"', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineHeading>Event</TimelineHeading>
				</TimelineItem>
			</Timeline>,
		)

		const el = bySlot(container, 'timeline')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('OL')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Timeline className="custom">
				<TimelineItem>
					<TimelineHeading>Event</TimelineHeading>
				</TimelineItem>
			</Timeline>,
		)

		const el = bySlot(container, 'timeline')

		expect(el?.className).toContain('custom')
	})
})

describe('TimelineItem', () => {
	it('renders with data-slot="timeline-item"', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineHeading>Event</TimelineHeading>
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-item')).toBeInTheDocument()
	})
})

describe('TimelineHeading', () => {
	it('renders with data-slot="timeline-heading"', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineHeading>Event</TimelineHeading>
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-heading')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineHeading>My Event</TimelineHeading>
				</TimelineItem>
			</Timeline>,
		)

		expect(screen.getByText('My Event')).toBeInTheDocument()
	})
})

describe('TimelineDescription', () => {
	it('renders with data-slot="timeline-description"', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineHeading>Event</TimelineHeading>
					<TimelineDescription>Details</TimelineDescription>
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-description')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineHeading>Event</TimelineHeading>
					<TimelineDescription>Some details</TimelineDescription>
				</TimelineItem>
			</Timeline>,
		)

		expect(screen.getByText('Some details')).toBeInTheDocument()
	})
})

describe('TimelineTimestamp', () => {
	it('renders with data-slot="timeline-timestamp"', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineTimestamp dateTime="2024-01-01">Jan 1</TimelineTimestamp>
				</TimelineItem>
			</Timeline>,
		)

		const el = bySlot(container, 'timeline-timestamp')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('TIME')

		expect(el).toHaveAttribute('datetime', '2024-01-01')
	})

	it('renders its children', () => {
		renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineTimestamp>Jan 1, 2024</TimelineTimestamp>
				</TimelineItem>
			</Timeline>,
		)

		expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineTimestamp className="custom">Jan 1</TimelineTimestamp>
				</TimelineItem>
			</Timeline>,
		)

		const el = bySlot(container, 'timeline-timestamp')

		expect(el?.className).toContain('custom')
	})

	it('reads horizontal orientation from the Timeline context', () => {
		const { container } = renderUI(
			<Timeline orientation="horizontal">
				<TimelineItem>
					<TimelineTimestamp>Jan 1</TimelineTimestamp>
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-timestamp')).toBeInTheDocument()
	})
})

describe('TimelineMarker', () => {
	it('renders a StatusDot by default', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineMarker />
				</TimelineItem>
			</Timeline>,
		)

		const marker = bySlot(container, 'timeline-marker')

		expect(marker).toBeInTheDocument()

		expect(marker?.querySelector('[data-slot="status-dot"]')).toBeInTheDocument()
	})

	it('renders custom children in place of the default StatusDot', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineMarker>
						<span data-testid="custom-marker">M</span>
					</TimelineMarker>
				</TimelineItem>
			</Timeline>,
		)

		const marker = bySlot(container, 'timeline-marker')

		expect(marker?.querySelector('[data-testid="custom-marker"]')).toBeInTheDocument()

		expect(marker?.querySelector('[data-slot="status-dot"]')).toBeNull()
	})

	it('forwards status to the default StatusDot', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineMarker status="active" />
				</TimelineItem>
			</Timeline>,
		)

		const marker = bySlot(container, 'timeline-marker')

		expect(marker?.querySelector('[data-slot="status-dot"]')).toBeInTheDocument()
	})

	it('applies lineBefore / lineAfter classes when configured', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineMarker lineBefore="blue" lineAfter="amber" />
				</TimelineItem>
			</Timeline>,
		)

		const marker = bySlot(container, 'timeline-marker')

		expect(marker?.className.length).toBeGreaterThan(0)
	})

	it('applies the color variant when no status is provided', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineMarker color="blue" />
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-marker')).toBeInTheDocument()
	})

	it('renders the horizontal variant via Timeline orientation', () => {
		const { container } = renderUI(
			<Timeline orientation="horizontal">
				<TimelineItem>
					<TimelineMarker />
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-marker')).toBeInTheDocument()
	})
})
