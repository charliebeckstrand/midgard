import { describe, expect, it } from 'vitest'
import { Group } from '../../components/group'
import { Density, useDensityStep } from '../../primitives/density'
import { bySlot, renderUI, screen } from '../helpers'

describe('Group', () => {
	it('defaults to horizontal orientation and inline-flex layout', () => {
		const { container } = renderUI(
			<Group>
				<button type="button">A</button>
				<button type="button">B</button>
			</Group>,
		)

		const root = bySlot(container, 'group')

		expect(root).toHaveAttribute('data-orientation', 'horizontal')

		expect(root?.className).toContain('inline-flex')

		expect(root?.className).toContain('flex-row')
	})

	it('takes no role by default, and takes a role and a name for a set of controls', () => {
		const { container, rerender } = renderUI(
			<Group>
				<button type="button">A</button>
			</Group>,
		)

		expect(bySlot(container, 'group')).not.toHaveAttribute('role')

		rerender(
			<Group role="group" aria-label="Text format">
				<button type="button">A</button>
			</Group>,
		)

		expect(screen.getByRole('group', { name: 'Text format' })).toBe(bySlot(container, 'group'))
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

		expect(root).toHaveAttribute('data-orientation', 'vertical')
	})

	it('provides a Density context to descendants', () => {
		let observed: string | undefined

		function Probe() {
			observed = useDensityStep()

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
			observed = useDensityStep()

			return null
		}

		renderUI(
			<Density step="sm">
				<Group>
					<Probe />
				</Group>
			</Density>,
		)

		expect(observed).toBe('sm')
	})
})
