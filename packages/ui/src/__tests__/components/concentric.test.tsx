import { describe, expect, it } from 'vitest'
import { useConcentric } from '../../components/concentric'
import { Concentric } from '../../components/concentric/component'
import { sun } from '../../recipes/ryu/sun'
import { bySlot, renderUI, screen } from '../helpers'

describe('Concentric', () => {
	it('renders a div with data-slot="concentric"', () => {
		const { container } = renderUI(<Concentric>content</Concentric>)

		const root = bySlot(container, 'concentric')

		expect(root).toBeInTheDocument()
		expect(root?.tagName).toBe('DIV')
	})

	it('defaults to size="md" when no size prop is provided', () => {
		const { container } = renderUI(<Concentric>content</Concentric>)

		expect(bySlot(container, 'concentric')).toHaveAttribute('data-step', 'md')
	})

	it('reflects the size prop on data-step', () => {
		const { container } = renderUI(<Concentric size="lg">content</Concentric>)

		expect(bySlot(container, 'concentric')).toHaveAttribute('data-step', 'lg')
	})

	it('exposes --ui-radius-inner and --ui-padding inline for the concentric formula', () => {
		const { container } = renderUI(<Concentric size="md">content</Concentric>)

		const root = bySlot(container, 'concentric')

		// var(--radius-lg) for md.
		expect(root?.style.getPropertyValue('--ui-radius-inner')).toBe(`var(--radius-${sun.md.radius})`)
		expect(root?.style.getPropertyValue('--ui-padding')).toBe(
			`calc(var(--spacing) * ${sun.md.space})`,
		)
	})

	it('applies the concentric outer-radius class derived from the formula', () => {
		const { container } = renderUI(<Concentric size="md">content</Concentric>)

		expect(bySlot(container, 'concentric')?.className).toContain(
			'rounded-[calc(var(--ui-radius-inner)+var(--ui-padding))]',
		)
	})

	it('applies the step padding class by default', () => {
		const { container } = renderUI(<Concentric size="md">content</Concentric>)

		expect(bySlot(container, 'concentric')?.className).toContain(`p-${sun.md.space}`)
	})

	it('omits the padding class when flush is set', () => {
		const { container } = renderUI(
			<Concentric size="md" flush>
				content
			</Concentric>,
		)

		expect(bySlot(container, 'concentric')?.className).not.toContain(`p-${sun.md.space}`)
	})

	it('forwards children', () => {
		renderUI(<Concentric>visible content</Concentric>)

		expect(screen.getByText('visible content')).toBeInTheDocument()
	})

	it('merges custom className', () => {
		const { container } = renderUI(<Concentric className="custom-class">content</Concentric>)

		expect(bySlot(container, 'concentric')?.className).toContain('custom-class')
	})

	it('useConcentric returns the active size to descendants', () => {
		let observed: string | undefined

		function Probe() {
			observed = useConcentric()?.size

			return null
		}

		renderUI(
			<Concentric size="lg">
				<Probe />
			</Concentric>,
		)

		expect(observed).toBe('lg')
	})

	it('useConcentric returns null outside any Concentric ancestor', () => {
		let observed: ReturnType<typeof useConcentric> = { size: 'md' }

		function Probe() {
			observed = useConcentric()

			return null
		}

		renderUI(<Probe />)

		expect(observed).toBeNull()
	})

	it('nested Concentric overrides the parent size for inner descendants', () => {
		const observed: string[] = []

		function Probe() {
			const ctx = useConcentric()

			if (ctx) observed.push(ctx.size)

			return null
		}

		renderUI(
			<Concentric size="sm">
				<Probe />
				<Concentric size="lg">
					<Probe />
				</Concentric>
			</Concentric>,
		)

		expect(observed).toEqual(['sm', 'lg'])
	})
})
