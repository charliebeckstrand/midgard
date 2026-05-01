import { describe, expect, it } from 'vitest'
import { Attached } from '../../components/attached'
import { Concentric, useConcentric } from '../../components/concentric'
import { allBySlot, bySlot, renderUI } from '../helpers'

describe('Attached', () => {
	it('renders a div with data-slot="attached"', () => {
		const { container } = renderUI(
			<Attached>
				<button type="button">Cut</button>
			</Attached>,
		)

		const root = bySlot(container, 'attached')

		expect(root).toBeInTheDocument()
		expect(root?.tagName).toBe('DIV')
	})

	it('defaults to horizontal orientation and inline-flex layout', () => {
		const { container } = renderUI(
			<Attached>
				<button type="button">A</button>
				<button type="button">B</button>
			</Attached>,
		)

		const root = bySlot(container, 'attached')

		expect(root).toHaveAttribute('data-attached-orientation', 'horizontal')
		expect(root?.className).toContain('inline-flex')
		expect(root?.className).toContain('flex-row')
	})

	it('switches to flex-col when vertical', () => {
		const { container } = renderUI(
			<Attached orientation="vertical">
				<button type="button">A</button>
				<button type="button">B</button>
			</Attached>,
		)

		const root = bySlot(container, 'attached')

		expect(root?.className).toContain('flex-col')
		expect(root?.className).not.toContain('flex-row')
		expect(root).toHaveAttribute('data-attached-orientation', 'vertical')
	})

	it('stamps "only" on a single child', () => {
		const { container } = renderUI(
			<Attached>
				<button type="button" data-slot="child">
					Lone
				</button>
			</Attached>,
		)

		const children = allBySlot(container, 'child')

		expect(children).toHaveLength(1)
		expect(children[0]).toHaveAttribute('data-attached', 'only')
	})

	it('stamps start/end on two children', () => {
		const { container } = renderUI(
			<Attached>
				<button type="button" data-slot="child">
					First
				</button>
				<button type="button" data-slot="child">
					Second
				</button>
			</Attached>,
		)

		const [first, second] = allBySlot(container, 'child')

		expect(first).toHaveAttribute('data-attached', 'start')
		expect(second).toHaveAttribute('data-attached', 'end')
	})

	it('stamps start/middle/end across three or more children', () => {
		const { container } = renderUI(
			<Attached>
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
			</Attached>,
		)

		const positions = allBySlot(container, 'child').map((el) => el.getAttribute('data-attached'))

		expect(positions).toEqual(['start', 'middle', 'middle', 'end'])
	})

	it('propagates orientation to every child', () => {
		const { container } = renderUI(
			<Attached orientation="vertical">
				<button type="button" data-slot="child">
					A
				</button>
				<button type="button" data-slot="child">
					B
				</button>
			</Attached>,
		)

		for (const child of allBySlot(container, 'child')) {
			expect(child).toHaveAttribute('data-attached-orientation', 'vertical')
		}
	})

	it('applies the explicit size prop to data-step', () => {
		const { container } = renderUI(
			<Attached size="lg">
				<button type="button">A</button>
			</Attached>,
		)

		expect(bySlot(container, 'attached')).toHaveAttribute('data-step', 'lg')
	})

	it('inherits size from an enclosing Concentric when size is omitted', () => {
		const { container } = renderUI(
			<Concentric size="sm">
				<Attached>
					<button type="button">A</button>
				</Attached>
			</Concentric>,
		)

		expect(bySlot(container, 'attached')).toHaveAttribute('data-step', 'sm')
	})

	it('explicit size overrides Concentric inheritance', () => {
		const { container } = renderUI(
			<Concentric size="sm">
				<Attached size="lg">
					<button type="button">A</button>
				</Attached>
			</Concentric>,
		)

		expect(bySlot(container, 'attached')).toHaveAttribute('data-step', 'lg')
	})

	it('falls back to "md" outside Concentric and without explicit size', () => {
		const { container } = renderUI(
			<Attached>
				<button type="button">A</button>
			</Attached>,
		)

		expect(bySlot(container, 'attached')).toHaveAttribute('data-step', 'md')
	})

	it('provides the same size context to descendants as <Concentric>', () => {
		let observed: string | undefined

		function Probe() {
			observed = useConcentric()?.size

			return null
		}

		renderUI(
			<Attached size="lg">
				<Probe />
			</Attached>,
		)

		expect(observed).toBe('lg')
	})

	it('descendants see the resolved size when Attached inherits from Concentric', () => {
		let observed: string | undefined

		function Probe() {
			observed = useConcentric()?.size

			return null
		}

		renderUI(
			<Concentric size="sm">
				<Attached>
					<Probe />
				</Attached>
			</Concentric>,
		)

		expect(observed).toBe('sm')
	})
})
