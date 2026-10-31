import { describe, expect, it } from 'vitest'
import { Text } from '../../components/text'
import { Density, useDensityStep } from '../../primitives/density'
import { k } from '../../recipes/kata/text'
import { bySlot, renderUI } from '../helpers'

describe('Text', () => {
	it('writes an explicit size as a density scope with the text ramp', () => {
		const { container } = renderUI(<Text size="lg">Large</Text>)

		const text = bySlot(container, 'text')

		expect(text).toHaveAttribute('data-density', 'lg')

		expect(text).toHaveClass(k.sized)
	})

	it('emits no type-scale class when size is unset', () => {
		const { container } = renderUI(<Text>Inherit</Text>)

		const text = bySlot(container, 'text')

		expect(text).not.toHaveClass('text-sm')

		expect(text).not.toHaveClass('text-base')

		expect(text).not.toHaveClass('text-lg')

		expect(text).not.toHaveClass(k.sized)

		expect(text).not.toHaveAttribute('data-density')
	})

	it('opens the density context of its size for client descendants', () => {
		function Probe() {
			return <span data-slot="probe">{useDensityStep()}</span>
		}

		const { container } = renderUI(
			<Density step="lg">
				<Text size="sm">
					<Probe />
				</Text>
			</Density>,
		)

		expect(bySlot(container, 'text')).toHaveAttribute('data-density', 'sm')

		expect(bySlot(container, 'probe')).toHaveTextContent('sm')
	})

	it('pulses with a standing dim for reduced motion only when pulse is set', () => {
		const { container, rerender } = renderUI(<Text pulse>Uploading</Text>)

		const text = bySlot(container, 'text')

		expect(text).toHaveClass('motion-safe:animate-pulse', 'motion-reduce:opacity-50')

		rerender(<Text>Uploaded</Text>)

		expect(text).not.toHaveClass('motion-safe:animate-pulse')

		expect(text).not.toHaveClass('motion-reduce:opacity-50')
	})
})
