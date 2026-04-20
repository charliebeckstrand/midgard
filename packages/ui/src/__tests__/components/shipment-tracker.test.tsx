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

	it('omits the timestamp slot for steps without a timestamp', () => {
		const { container } = renderUI(<ShipmentTracker steps={steps} currentIndex={1} />)

		const withTimestamp = steps.filter((step) => step.timestamp).length

		expect(allBySlot(container, 'timeline-timestamp')).toHaveLength(withTimestamp)
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
})
