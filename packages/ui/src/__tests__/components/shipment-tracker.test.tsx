import { describe, expect, it } from 'vitest'
import { ShipmentTracker } from '../../components/shipment-tracker'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

const steps = [
	{ label: 'Ordered', timestamp: 'Mar 12, 9:12 AM' },
	{ label: 'Shipped', timestamp: 'Mar 13, 2:45 PM' },
	{ label: 'Out for delivery', timestamp: 'Mar 15, 8:03 AM' },
	{ label: 'Delivered' },
]

describe('ShipmentTracker', () => {
	it('renders with data-slot="shipment-tracker"', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		const el = bySlot(container, 'shipment-tracker')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<ShipmentTracker steps={steps} currentIndex={1} className="custom" />,
		)

		const el = bySlot(container, 'shipment-tracker')

		expect(el?.className).toContain('custom')
	})

	it('renders one timeline item per entry', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		expect(allBySlot(container, 'timeline-item')).toHaveLength(steps.length)
	})

	it('renders step labels', () => {
		renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		for (const step of steps) {
			expect(screen.getByText(step.label)).toBeInTheDocument()
		}
	})

	it('renders timestamps when provided', () => {
		renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		expect(screen.getByText('Mar 12, 9:12 AM')).toBeInTheDocument()

		expect(screen.getByText('Mar 13, 2:45 PM')).toBeInTheDocument()
	})

	it('omits the timestamp slot when a step has no timestamp', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		const timestamps = allBySlot(container, 'timeline-timestamp')

		expect(timestamps).toHaveLength(steps.length - 1)
	})

	it('renders descriptions when provided', () => {
		const withDescriptions = steps.map((step, index) =>
			index === 0 ? { ...step, description: 'Warehouse in Phoenix, AZ' } : step,
		)

		renderUI(<ShipmentTracker steps={withDescriptions} currentIndex={1} />)

		expect(screen.getByText('Warehouse in Phoenix, AZ')).toBeInTheDocument()
	})

	it('marks the current step as active', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={2} />)

		const active = container.querySelector('[data-slot="timeline-item"][data-active]')

		expect(active).toBeInTheDocument()

		expect(active).toHaveTextContent('Out for delivery')
	})

	it('marks exactly one current step', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		expect(container.querySelectorAll('[data-slot="timeline-item"][data-active]')).toHaveLength(1)
	})

	it('uses solid markers for completed and current steps, outline for upcoming', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		const markers = allBySlot(container, 'status-dot')

		expect(markers[0]?.className).toContain('bg-current')

		expect(markers[1]?.className).toContain('bg-current')

		expect(markers[2]?.className).toContain('border-2')

		expect(markers[3]?.className).toContain('border-2')
	})

	it('applies info status and pulse to a non-final current step', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		const currentMarker = allBySlot(container, 'status-dot')[1]

		expect(currentMarker?.className).toContain('text-blue-500')

		expect(currentMarker?.className).toContain('animate-pulse')
	})

	it('applies active status and no pulse when currentIndex is the final step', () => {
		const { container } = renderUI(
			<ShipmentTracker steps={steps} currentIndex={steps.length - 1} />,
		)

		const finalMarker = allBySlot(container, 'status-dot')[steps.length - 1]

		expect(finalMarker?.className).toContain('text-green-500')

		expect(finalMarker?.className).not.toContain('animate-pulse')
	})

	it('applies inactive status to upcoming steps', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={0} />)

		const markers = allBySlot(container, 'status-dot')

		expect(markers[2]?.className).toContain('text-zinc-300')

		expect(markers[3]?.className).toContain('text-zinc-300')
	})

	it('forwards orientation to the timeline', () => {
		const { container } = renderUI(
			<ShipmentTracker steps={steps} currentIndex={1} orientation="horizontal" />,
		)

		expect(bySlot(container, 'timeline')?.className).toContain('flex-row')
	})

	it('falls back to the array index for the key when step.id is missing', () => {
		const unkeyed = [{ label: 'A' }, { label: 'B' }, { label: 'C' }]

		const { container } = renderUI(<ShipmentTracker steps={unkeyed} currentIndex={0} />)

		expect(allBySlot(container, 'timeline-item')).toHaveLength(3)
	})
})
