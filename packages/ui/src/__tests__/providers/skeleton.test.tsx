import { describe, expect, it } from 'vitest'
import { Skeleton, useSkeleton } from '../../providers/skeleton'
import { bySlot, renderUI, screen } from '../helpers'

function SkeletonProbe() {
	return <span data-testid="probe">{useSkeleton() ? 'skeleton' : 'real'}</span>
}

describe('Skeleton', () => {
	it('renders the skeleton wrapper when ready is undefined', () => {
		const { container } = renderUI(
			<Skeleton>
				<span>content</span>
			</Skeleton>,
		)

		const el = bySlot(container, 'skeleton')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-busy', 'true')
	})

	it('puts descendants in skeleton mode when ready is undefined', () => {
		renderUI(
			<Skeleton>
				<SkeletonProbe />
			</Skeleton>,
		)

		expect(screen.getByTestId('probe')).toHaveTextContent('skeleton')
	})

	it('applies custom className to the wrapper', () => {
		const { container } = renderUI(
			<Skeleton className="custom">
				<span>content</span>
			</Skeleton>,
		)

		const el = bySlot(container, 'skeleton')

		expect(el?.className).toContain('custom')
	})

	it('renders both placeholder and real content when ready is provided', () => {
		const { container } = renderUI(
			<Skeleton ready={false}>
				<SkeletonProbe />
			</Skeleton>,
		)

		expect(bySlot(container, 'ready-reveal')).toBeInTheDocument()

		const probes = screen.getAllByTestId('probe')

		const states = probes.map((p) => p.textContent)

		expect(states).toContain('skeleton')

		expect(states).toContain('real')
	})

	it('renders both placeholder and real content when ready is true', () => {
		const { container } = renderUI(
			<Skeleton ready={true}>
				<SkeletonProbe />
			</Skeleton>,
		)

		expect(bySlot(container, 'ready-reveal')).toBeInTheDocument()
	})
})
