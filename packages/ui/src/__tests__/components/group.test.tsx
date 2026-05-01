import { describe, expect, it } from 'vitest'
import { useConcentric } from '../../components/concentric'
import { Concentric } from '../../components/concentric/component'
import { Group } from '../../components/group'
import { allBySlot, bySlot, renderUI } from '../helpers'

describe('Group', () => {
	it('renders a div with data-slot="group"', () => {
		const { container } = renderUI(
			<Group>
				<button type="button">Cut</button>
			</Group>,
		)

		const root = bySlot(container, 'group')

		expect(root).toBeInTheDocument()
		expect(root?.tagName).toBe('DIV')
	})

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

	it('applies the explicit size prop to data-step', () => {
		const { container } = renderUI(
			<Group size="lg">
				<button type="button">A</button>
			</Group>,
		)

		expect(bySlot(container, 'group')).toHaveAttribute('data-step', 'lg')
	})

	it('inherits size from an enclosing Concentric when size is omitted', () => {
		const { container } = renderUI(
			<Concentric size="sm">
				<Group>
					<button type="button">A</button>
				</Group>
			</Concentric>,
		)

		expect(bySlot(container, 'group')).toHaveAttribute('data-step', 'sm')
	})

	it('explicit size overrides Concentric inheritance', () => {
		const { container } = renderUI(
			<Concentric size="sm">
				<Group size="lg">
					<button type="button">A</button>
				</Group>
			</Concentric>,
		)

		expect(bySlot(container, 'group')).toHaveAttribute('data-step', 'lg')
	})

	it('falls back to "md" outside Concentric and without explicit size', () => {
		const { container } = renderUI(
			<Group>
				<button type="button">A</button>
			</Group>,
		)

		expect(bySlot(container, 'group')).toHaveAttribute('data-step', 'md')
	})

	it('provides the same size context to descendants as <Concentric>', () => {
		let observed: string | undefined

		function Probe() {
			observed = useConcentric()?.size

			return null
		}

		renderUI(
			<Group size="lg">
				<Probe />
			</Group>,
		)

		expect(observed).toBe('lg')
	})

	it('descendants see the resolved size when Group inherits from Concentric', () => {
		let observed: string | undefined

		function Probe() {
			observed = useConcentric()?.size

			return null
		}

		renderUI(
			<Concentric size="sm">
				<Group>
					<Probe />
				</Group>
			</Concentric>,
		)

		expect(observed).toBe('sm')
	})
})
