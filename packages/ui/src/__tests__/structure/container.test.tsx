import { describe, expect, it } from 'vitest'
import { Container } from '../../structure/container'
import { bySlot, renderUI } from '../helpers'

describe('Container', () => {
	it('applies the horizontal padding at every width', () => {
		const { container } = renderUI(<Container padding="lg" />)

		const el = bySlot(container, 'container')

		expect(el).toHaveClass('px-6')
		expect(el).not.toHaveClass('lg:px-6')
	})

	it('applies the maximum width from lg up', () => {
		const { container } = renderUI(<Container size="sm" />)

		expect(bySlot(container, 'container')).toHaveClass('lg:max-w-4xl')
	})
})
