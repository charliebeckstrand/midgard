import { describe, expect, it } from 'vitest'
import { Text, TextSkeleton } from '../../components/text'
import { bySlot, renderUI } from '../helpers'

describe('Text', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Text id="intro">Intro</Text>)

		const text = bySlot(container, 'text')

		expect(text).toHaveAttribute('id', 'intro')
	})

	it('pairs with an explicit TextSkeleton in loading trees', () => {
		const { container } = renderUI(<TextSkeleton />)

		expect(bySlot(container, 'text')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
