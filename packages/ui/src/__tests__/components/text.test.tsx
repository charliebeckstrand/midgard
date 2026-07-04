import { describe, expect, it } from 'vitest'
import { Text, TextSkeleton } from '../../components/text'
import { bySlot, renderUI } from '../helpers'

describe('Text', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Text id="intro">Intro</Text>)

		const text = bySlot(container, 'text')

		expect(text).toHaveAttribute('id', 'intro')
	})

	it('applies the type scale from an explicit size', () => {
		const { container } = renderUI(<Text size="lg">Large</Text>)

		expect(bySlot(container, 'text')).toHaveClass('text-lg')
	})

	it('emits no type-scale class when size is unset', () => {
		const { container } = renderUI(<Text>Inherit</Text>)

		const text = bySlot(container, 'text')

		expect(text).not.toHaveClass('text-sm')

		expect(text).not.toHaveClass('text-base')

		expect(text).not.toHaveClass('text-lg')
	})

	it('pairs with an explicit TextSkeleton in loading trees', () => {
		const { container } = renderUI(<TextSkeleton />)

		expect(bySlot(container, 'text')).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
