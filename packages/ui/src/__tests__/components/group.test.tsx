import { describe, expect, it } from 'vitest'
import { Group } from '../../components/group'
import { Density, useDensity } from '../../primitives/density'
import { allBySlot, bySlot, renderUI } from '../helpers'

describe('Group', () => {
	it('defaults to horizontal orientation and inline-flex layout', () => {
		const { container } = renderUI(
			<Group>
				<button type="button">A</button>
				<button type="button">B</button>
			</Group>,
		)

		const root = bySlot(container, 'group')

		expect(root).toHaveAttribute('data-group-orientation', 'horizontal')
		expect(root?.className).toContain('inline-flex')
		expect(root?.className).toContain('flex-row')
	})

	it('switches to flex-col when vertical', () => {
		const { container } = renderUI(
			<Group orientation="vertical">
				<button type="button">A</button>
				<button type="button">B</button>
			</Group>,
		)

		const root = bySlot(container, 'group')

		expect(root?.className).toContain('flex-col')
		expect(root?.className).not.toContain('flex-row')
		expect(root).toHaveAttribute('data-group-orientation', 'vertical')
	})

	it('stamps "only" on a single child', () => {
		const { container } = renderUI(
			<Group>
				<button type="button" data-slot="child">
					Lone
				</button>
			</Group>,
		)

		const children = allBySlot(container, 'child')

		expect(children).toHaveLength(1)
		expect(children[0]).toHaveAttribute('data-group', 'only')
	})

	it('stamps start/end on two children', () => {
		const { container } = renderUI(
			<Group>
				<button type="button" data-slot="child">
					First
				</button>
				<button type="button" data-slot="child">
					Second
				</button>
			</Group>,
		)

		const [first, second] = allBySlot(container, 'child')

		expect(first).toHaveAttribute('data-group', 'start')
		expect(second).toHaveAttribute('data-group', 'end')
	})

	it('stamps start/middle/end across three or more children', () => {
		const { container } = renderUI(
			<Group>
				<button type="button" data-slot="child">
					A
				</button>
				<button type="button" data-slot="child">
					B
				</button>
				<button type="button" data-slot="child">
					C
				</button>
				<button type="button" data-slot="child">
					D
				</button>
			</Group>,
		)

		const positions = allBySlot(container, 'child').map((el) => el.getAttribute('data-group'))

		expect(positions).toEqual(['start', 'middle', 'middle', 'end'])
	})

	it('propagates orientation to every child', () => {
		const { container } = renderUI(
			<Group orientation="vertical">
				<button type="button" data-slot="child">
					A
				</button>
				<button type="button" data-slot="child">
					B
				</button>
			</Group>,
		)

		for (const child of allBySlot(container, 'child')) {
			expect(child).toHaveAttribute('data-group-orientation', 'vertical')
		}
	})

	it('applies the explicit size prop to data-density', () => {
		const { container } = renderUI(
			<Group size="lg">
				<button type="button">A</button>
			</Group>,
		)

		expect(bySlot(container, 'group')).toHaveAttribute('data-density', 'lg')
	})

	it('inherits size from an enclosing Density context when size is omitted', () => {
		const { container } = renderUI(
			<Density scale="sm">
				<Group>
					<button type="button">A</button>
				</Group>
			</Density>,
		)

		expect(bySlot(container, 'group')).toHaveAttribute('data-density', 'sm')
	})

	it('explicit size overrides Density inheritance', () => {
		const { container } = renderUI(
			<Density scale="sm">
				<Group size="lg">
					<button type="button">A</button>
				</Group>
			</Density>,
		)

		expect(bySlot(container, 'group')).toHaveAttribute('data-density', 'lg')
	})

	it('falls back to "md" outside any Density context and without explicit size', () => {
		const { container } = renderUI(
			<Group>
				<button type="button">A</button>
			</Group>,
		)

		expect(bySlot(container, 'group')).toHaveAttribute('data-density', 'md')
	})

	it('provides a Density context to descendants', () => {
		let observed: string | undefined

		function Probe() {
			observed = useDensity().size

			return null
		}

		renderUI(
			<Group size="lg">
				<Probe />
			</Group>,
		)

		expect(observed).toBe('lg')
	})

	it('descendants see the resolved size when Group inherits from an outer Density context', () => {
		let observed: string | undefined

		function Probe() {
			observed = useDensity().size

			return null
		}

		renderUI(
			<Density scale="sm">
				<Group>
					<Probe />
				</Group>
			</Density>,
		)

		expect(observed).toBe('sm')
	})
})
