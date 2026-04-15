import { describe, expect, it } from 'vitest'
import {
	Timeline,
	TimelineDescription,
	TimelineHeading,
	TimelineItem,
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
