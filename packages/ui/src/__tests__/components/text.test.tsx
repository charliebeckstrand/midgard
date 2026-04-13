import { describe, expect, it } from 'vitest'
import { Text } from '../../components/text'
import { bySlot, renderUI, screen } from '../helpers'

describe('Text', () => {
	it('renders a p element with data-slot="text"', () => {
		const { container } = renderUI(<Text>Hello</Text>)

		const text = bySlot(container, 'text')

		expect(text).toBeInTheDocument()

		expect(text?.tagName).toBe('P')
	})

	it('renders children', () => {
		renderUI(<Text>Some paragraph text</Text>)

		expect(screen.getByText('Some paragraph text')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Text className="prose">Content</Text>)

		const text = bySlot(container, 'text')

		expect(text?.className).toContain('prose')
	})

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
