import { describe, expect, it } from 'vitest'
import { Text } from '../../components/text'
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
})
