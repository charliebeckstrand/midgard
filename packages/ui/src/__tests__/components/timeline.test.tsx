import { describe, expect, it } from 'vitest'
import {
	Timeline,
	TimelineItem,
	TimelineSkeleton,
	TimelineTimestamp,
	TimelineTitle,
} from '../../components/timeline'
import { bySlot, renderUI, screen } from '../helpers'

describe('Timeline', () => {
	it('renders with data-slot="timeline"', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineTitle>Event</TimelineTitle>
				</TimelineItem>
			</Timeline>,
		)

		const el = bySlot(container, 'timeline')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('OL')
	})

	it('marks the current item as a step, as Stepper does', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem current>
					<TimelineTitle>Event</TimelineTitle>
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-item')).toHaveAttribute('aria-current', 'step')
	})
})

describe('TimelineTitle', () => {
	it('renders a div with no level, and a heading at the level that it is given', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineTitle>Plain</TimelineTitle>
				</TimelineItem>
				<TimelineItem>
					<TimelineTitle level={3}>Shipped</TimelineTitle>
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-title')?.tagName).toBe('DIV')

		expect(screen.getByRole('heading', { level: 3, name: 'Shipped' })).toHaveAttribute(
			'data-slot',
			'timeline-title',
		)
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

	it('renders a span without dateTime, because free text is not a valid <time> value', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineTimestamp>Last week</TimelineTimestamp>
				</TimelineItem>
			</Timeline>,
		)

		const el = bySlot(container, 'timeline-timestamp')

		expect(el?.tagName).toBe('SPAN')

		expect(el).not.toHaveAttribute('datetime')
	})

	it('reads horizontal orientation from the Timeline context', () => {
		const { container } = renderUI(
			<Timeline orientation="horizontal">
				<TimelineItem>
					<TimelineTimestamp>Jan 1</TimelineTimestamp>
				</TimelineItem>
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-timestamp')).toHaveClass('order-3')
	})
})

describe('TimelineItem marker', () => {
	it('renders a StatusDot by default', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem />
			</Timeline>,
		)

		const marker = bySlot(container, 'timeline-marker')

		expect(marker).toBeInTheDocument()

		expect(marker?.querySelector('[data-slot="status-dot"]')).toBeInTheDocument()
	})

	it('names the status dot so its color is not the sole signal', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem status="error" />
			</Timeline>,
		)

		const dot = bySlot(container, 'status-dot')

		expect(dot).toHaveAttribute('role', 'img')

		expect(dot).toHaveAccessibleName('Error')
	})

	it('leaves a color-only marker decorative', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem color="blue" />
			</Timeline>,
		)

		const dot = bySlot(container, 'swatch')

		expect(dot).not.toHaveAttribute('role')

		expect(dot).not.toHaveAttribute('aria-label')
	})

	it('applies lineBefore / lineAfter classes when configured', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem lineBefore="blue" lineAfter="amber" />
			</Timeline>,
		)

		const marker = bySlot(container, 'timeline-marker')

		// The configured palettes, not the 'zinc' defaults: the inbound rail is
		// painted blue and the outbound rail amber. A prop-less marker emits the
		// zinc rail classes instead, so these assertions would fail for it.
		expect(marker?.className).toContain('before:bg-blue-600')

		expect(marker?.className).toContain('after:bg-amber-600')
	})

	it('paints a color-only marker in the requested hue', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem color="blue" />
			</Timeline>,
		)

		// The decorative dot paints the marker hue directly. Regression guard: it
		// used to render a <StatusDot> whose default 'inactive' status color
		// overrode `color`, so every color-only marker showed zinc.
		expect(bySlot(container, 'swatch')?.className).toContain('text-blue-600')
	})

	it('renders the horizontal variant via Timeline orientation', () => {
		const { container } = renderUI(
			<Timeline orientation="horizontal">
				<TimelineItem />
			</Timeline>,
		)

		expect(bySlot(container, 'timeline-marker')).toHaveClass('absolute', 'top-0')
	})
})

describe('TimelineSkeleton', () => {
	it('hides its list from assistive technology, so no empty items are read', () => {
		const { container } = renderUI(<TimelineSkeleton items={2} />)

		const root = container.firstElementChild

		expect(root?.tagName).toBe('OL')

		expect(root).toHaveAttribute('aria-hidden', 'true')

		expect(root?.querySelectorAll(':scope > li')).toHaveLength(2)
	})
})
