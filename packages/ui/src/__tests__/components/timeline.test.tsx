import { describe, expect, it } from 'vitest'
import {
	Timeline,
	TimelineItem,
	TimelineMarker,
	TimelineTimestamp,
	TimelineTitle,
} from '../../components/timeline'
import { bySlot, renderUI } from '../helpers'

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

	it('names the status dot so its colour is not the sole signal', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineMarker status="error" />
				</TimelineItem>
			</Timeline>,
		)

		const dot = bySlot(container, 'status-dot')

		expect(dot).toHaveAttribute('role', 'img')

		expect(dot).toHaveAccessibleName('Error')
	})

	it('leaves a colour-only marker decorative', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineMarker color="blue" />
				</TimelineItem>
			</Timeline>,
		)

		const dot = bySlot(container, 'swatch')

		expect(dot).not.toHaveAttribute('role')

		expect(dot).not.toHaveAttribute('aria-label')
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

		// The configured palettes, not the 'zinc' defaults: the inbound rail is
		// painted blue and the outbound rail amber. A prop-less marker emits the
		// zinc rail classes instead, so these assertions would fail for it.
		expect(marker?.className).toContain('before:bg-blue-600')

		expect(marker?.className).toContain('after:bg-amber-600')
	})

	it('paints a colour-only marker in the requested hue', () => {
		const { container } = renderUI(
			<Timeline>
				<TimelineItem>
					<TimelineMarker color="blue" />
				</TimelineItem>
			</Timeline>,
		)

		// The decorative dot paints the marker hue directly. Regression guard: it
		// used to render a <StatusDot> whose default 'inactive' status colour
		// overrode `color`, so every colour-only marker showed zinc.
		expect(bySlot(container, 'swatch')?.className).toContain('text-blue-600')
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
