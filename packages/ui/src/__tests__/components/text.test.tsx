import { describe, expect, it } from 'vitest'
import { Text } from '../../components/text'
import { bySlot, renderUI } from '../helpers'

describe('Text', () => {
	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Text id="intro">Intro</Text>)

		const text = bySlot(container, 'text')

		expect(text).toHaveAttribute('id', 'intro')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Text>Hello</Text>, { skeleton: true })

		expect(bySlot(container, 'text')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
