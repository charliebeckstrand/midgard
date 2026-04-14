import { describe, expect, it, vi } from 'vitest'
import { Segment, SegmentedControl } from '../../components/segmented-control'
import { allBySlot, bySlot, renderUI } from '../helpers'

describe('SegmentedControl', () => {
	it('renders with data-slot="segmented-control"', () => {
		const { container } = renderUI(
			<SegmentedControl value="a">
				<Segment value="a">A</Segment>
				<Segment value="b">B</Segment>
			</SegmentedControl>,
		)

		expect(bySlot(container, 'segmented-control')).toBeInTheDocument()
	})

	it('renders segments with role="radio"', () => {
		const { container } = renderUI(
			<SegmentedControl value="a">
				<Segment value="a">A</Segment>
				<Segment value="b">B</Segment>
			</SegmentedControl>,
		)

		const segments = allBySlot(container, 'segment')

		expect(segments).toHaveLength(2)

		expect(segments[0]).toHaveAttribute('role', 'radio')
		expect(segments[1]).toHaveAttribute('role', 'radio')
	})

	it('marks the selected segment as aria-checked', () => {
		const { container } = renderUI(
			<SegmentedControl value="b">
				<Segment value="a">A</Segment>
				<Segment value="b">B</Segment>
			</SegmentedControl>,
		)

		const segments = allBySlot(container, 'segment')

		expect(segments[0]).toHaveAttribute('aria-checked', 'false')
		expect(segments[1]).toHaveAttribute('aria-checked', 'true')
	})

	it('calls onValueChange when a segment is clicked', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<SegmentedControl value="a" onValueChange={onValueChange}>
				<Segment value="a">A</Segment>
				<Segment value="b">B</Segment>
			</SegmentedControl>,
		)

		allBySlot(container, 'segment')[1]?.click()

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it('does not call onValueChange for disabled segments', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<SegmentedControl value="a" onValueChange={onValueChange}>
				<Segment value="a">A</Segment>
				<Segment value="b" disabled>
					B
				</Segment>
			</SegmentedControl>,
		)

		allBySlot(container, 'segment')[1]?.click()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('applies custom className to root', () => {
		const { container } = renderUI(
			<SegmentedControl value="a" className="custom">
				<Segment value="a">A</Segment>
			</SegmentedControl>,
		)

		expect(bySlot(container, 'segmented-control')?.className).toContain('custom')
	})

	it('applies custom className to segment', () => {
		const { container } = renderUI(
			<SegmentedControl value="a">
				<Segment value="a" className="custom">
					A
				</Segment>
			</SegmentedControl>,
		)

		expect(bySlot(container, 'segment')?.className).toContain('custom')
	})

	it('has role="radiogroup" on the container', () => {
		const { container } = renderUI(
			<SegmentedControl value="a">
				<Segment value="a">A</Segment>
			</SegmentedControl>,
		)

		expect(bySlot(container, 'segmented-control')).toHaveAttribute('role', 'radiogroup')
	})
})
